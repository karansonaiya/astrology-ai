export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  // Only meaningful on a "user" turn — an image attached to that message
  // (e.g. a horoscope printout or palm photo), sent inline to providers that
  // support vision.
  image?: { data: string; mimeType: string }; // data = raw base64, no data-URI prefix
};

export type CompletionRequest = {
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
};

export type CompletionResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: "anthropic" | "openai" | "gemini" | "mock";
};

export interface AiProvider {
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

// ---------------------------------------------------------------------------
// Anthropic Claude
// ---------------------------------------------------------------------------
class AnthropicProvider implements AiProvider {
  private model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        system: req.system,
        max_tokens: req.maxTokens,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: m.image
            ? [
                { type: "image", source: { type: "base64", media_type: m.image.mimeType, data: m.image.data } },
                { type: "text", text: m.content || "What do you see in this image?" },
              ]
            : m.content,
        })),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = (data.content ?? []).map((b: { type: string; text?: string }) => b.text ?? "").join("");

    return {
      text,
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      model: this.model,
      provider: "anthropic",
    };
  }
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
class OpenAiProvider implements AiProvider {
  private model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        messages: [
          { role: "system", content: req.system },
          ...req.messages.map((m) => ({
            role: m.role,
            content: m.image
              ? [
                  { type: "text", text: m.content || "What do you see in this image?" },
                  { type: "image_url", image_url: { url: `data:${m.image.mimeType};base64,${m.image.data}` } },
                ]
              : m.content,
          })),
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    return {
      text,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      model: this.model,
      provider: "openai",
    };
  }
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------
class GeminiProvider implements AiProvider {
  private model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: req.system }] },
          contents: req.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: m.image
              ? [
                  { text: m.content || "What do you see in this image?" },
                  { inline_data: { mime_type: m.image.mimeType, data: m.image.data } },
                ]
              : [{ text: m.content }],
          })),
          // thinkingConfig.thinkingBudget: Gemini's internal "thinking"
          // tokens silently count against maxOutputTokens, so replies can
          // get cut off mid-sentence even at a seemingly generous budget.
          // thinkingBudget: 0 would fully disable thinking, but as of the
          // currently configured GEMINI_MODEL=gemini-3.6-flash, 0 is
          // rejected outright with a 400 INVALID_ARGUMENT (reproduced live
          // 2026-09-02 — every chat/career/relationship/report call failed
          // with a 500 because of this). 1 is the smallest value this model
          // accepts. IMPORTANT, found live the same day: 1 is NOT a
          // reliable cap on actual thinking usage for this model — a
          // Gujarati chat reply still spent 600-900+ tokens on invisible
          // thinking regardless (it scaled with whatever maxOutputTokens
          // room was available, not with the requested budget), truncating
          // the visible reply after 1-2 sentences. So thinkingBudget here
          // is really just "the minimum this model will accept", not a
          // truncation fix — the actual fix for truncation is giving
          // maxOutputTokens enough headroom in the first place (see
          // index.ts's MAX_OUTPUT_TOKENS comment). Re-verify all of this if
          // GEMINI_MODEL changes.
          generationConfig: { maxOutputTokens: req.maxTokens, thinkingConfig: { thinkingBudget: 1 } },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("");

    return {
      text,
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      model: this.model,
      provider: "gemini",
    };
  }
}

// ---------------------------------------------------------------------------
// Mock — deterministic, offline, zero-cost. Used by default so the app runs
// end-to-end with no API keys configured.
// ---------------------------------------------------------------------------
class MockAiProvider implements AiProvider {
  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const lastTurn = [...req.messages].reverse().find((m) => m.role === "user");
    const lastUser = lastTurn?.content ?? "";
    const isGujarati = /[઀-૿]/.test(lastUser);
    const isHindi = /[ऀ-ॿ]/.test(lastUser);

    const text =
      (isGujarati
        ? mockReplyGu(lastUser)
        : isHindi
          ? mockReplyHi(lastUser)
          : mockReplyEn(lastUser)) + (lastTurn?.image ? "\n\n[mock: image received, not actually analyzed]" : "");

    return {
      text,
      promptTokens: Math.ceil((req.system.length + lastUser.length) / 4),
      completionTokens: Math.ceil(text.length / 4),
      model: "mock-astrology-v1",
      provider: "mock",
    };
  }
}

function mockReplyEn(question: string) {
  return `Thank you for sharing that. Taking a reflective look at "${question.slice(0, 140)}", this seems like a good moment to pause and notice what has felt meaningful to you recently. Rather than looking for one certain answer, consider taking one small, concrete step this week toward what matters most to you — and revisit how it feels in a few days.\n\nNote: This is AI-generated astrology-based general guidance, not a certain prediction.`;
}
function mockReplyHi(question: string) {
  return `यह साझा करने के लिए धन्यवाद। "${question.slice(0, 140)}" पर चिंतनशील नज़र डालते हुए, यह रुककर देखने का अच्छा समय लगता है कि हाल में आपके लिए क्या सार्थक रहा है। एक निश्चित जवाब खोजने के बजाय, इस सप्ताह उस दिशा में एक छोटा, ठोस कदम उठाने पर विचार करें जो आपके लिए सबसे मायने रखता है।\n\nनोट: यह AI-जनित ज्योतिष-आधारित सामान्य मार्गदर्शन है, कोई निश्चित भविष्यवाणी नहीं।`;
}
function mockReplyGu(question: string) {
  return `આ શેર કરવા બદલ આભાર. "${question.slice(0, 140)}" પર ચિંતનશીલ નજર કરીએ તો, અટકીને એ જોવાનો સારો સમય લાગે છે કે તાજેતરમાં તમારા માટે શું અર્થપૂર્ણ રહ્યું છે. એક ચોક્કસ જવાબ શોધવાને બદલે, આ અઠવાડિયે તમારા માટે સૌથી મહત્વનું છે તેની દિશામાં એક નાનું, નક્કર પગલું ભરવાનું વિચારો.\n\nનોંધ: આ AI-જનરેટેડ જ્યોતિષ આધારિત સામાન્ય માર્ગદર્શન છે, ખાતરીપૂર્વકની આગાહી નથી.`;
}

export function getAiProvider(): AiProvider {
  switch (process.env.AI_PROVIDER) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAiProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      return new MockAiProvider();
  }
}
