import { getAiProvider } from "./provider";
import type { NumerologyNumbers } from "@/lib/numerology/calculate";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * kundli-explanation.ts / palm-reading.ts for calling getAiProvider()
 * directly: strict JSON the UI renders into fixed cards. The numbers
 * themselves are never computed or adjusted here - only interpreted (see
 * calculate.ts's header comment on why they're 100% deterministic math,
 * not an AI guess).
 */
export type NumerologyMeaning = { number: number; title: string; meaning: string };
export type NumerologyReading = {
  lifePath: NumerologyMeaning;
  destiny: NumerologyMeaning;
  soulUrge: NumerologyMeaning;
  personality: NumerologyMeaning;
  birthday: NumerologyMeaning;
  summary: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 2000;

export async function generateNumerologyReading(numbers: NumerologyNumbers, locale: AppLocale): Promise<NumerologyReading> {
  const langName = LANG_NAME[locale];

  const system = `You write traditional Pythagorean numerology readings. You are given five ALREADY-CALCULATED real numbers - never question, recalculate, or change them, only interpret exactly the numbers given. Never give medical, legal, or financial advice, never claim certainty about the future, never use fear tactics. This is traditional interpretation for reflection, not certainty. Write entirely in ${langName}.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "lifePath": {"title": "short traditional title for this Life Path number", "meaning": "3-4 sentences"},
  "destiny": {"title": "...", "meaning": "3-4 sentences"},
  "soulUrge": {"title": "...", "meaning": "3-4 sentences"},
  "personality": {"title": "...", "meaning": "3-4 sentences"},
  "birthday": {"title": "...", "meaning": "2-3 sentences"},
  "summary": "3-4 sentence warm, reflective wrap-up tying all five numbers together"
}`;

  const userPrompt = `Here are the real calculated numerology numbers:
Life Path Number: ${numbers.lifePath}
Destiny (Expression) Number: ${numbers.destiny}
Soul Urge Number: ${numbers.soulUrge}
Personality Number: ${numbers.personality}
Birthday Number: ${numbers.birthday}

Write the full reading as specified, interpreting exactly these numbers.`;

  const result = await getAiProvider().complete({
    system,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

  type RawMeaning = { title: string; meaning: string };
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    lifePath?: RawMeaning;
    destiny?: RawMeaning;
    soulUrge?: RawMeaning;
    personality?: RawMeaning;
    birthday?: RawMeaning;
    summary?: string;
  };
  if (!parsed.lifePath || !parsed.destiny || !parsed.soulUrge || !parsed.personality || !parsed.birthday || !parsed.summary) {
    throw new Error("AI response is missing required numerology fields");
  }

  return {
    lifePath: { number: numbers.lifePath, ...parsed.lifePath },
    destiny: { number: numbers.destiny, ...parsed.destiny },
    soulUrge: { number: numbers.soulUrge, ...parsed.soulUrge },
    personality: { number: numbers.personality, ...parsed.personality },
    birthday: { number: numbers.birthday, ...parsed.birthday },
    summary: parsed.summary,
  };
}
