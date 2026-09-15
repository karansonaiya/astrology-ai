import { getAiProvider } from "./provider";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Palm reading (hast rekha) — grounded in a REAL uploaded photo via the AI
 * provider's real vision support (see provider.ts's ChatTurn.image, already
 * wired for chat's image attachments; this reuses the exact same
 * mechanism). Calls getAiProvider().complete() directly rather than
 * generateAstrologyReply() — same reasoning as kundli-explanation.ts:
 * strict JSON output the UI renders into fixed cards, not free-form chat.
 * The hard safety rules (never invent what isn't in the photo, no medical/
 * health/lifespan claims, reflection not certainty) are inlined into the
 * system prompt below instead of coming from policy.ts, since this bypasses
 * it - same accepted trade-off as kundli-explanation.ts (no AiUsageLog
 * entry for this call; credit consumption is handled separately by the
 * route, same as every other AI feature).
 *
 * Deliberately does NOT ask the model for line coordinates/bounding boxes
 * to draw an overlay with - vision models are not reliably accurate at
 * pixel-level tracing of fine skin creases (unlike locating a hand at all,
 * which real hand-landmark detection - see the client-side MediaPipe use
 * in palm-reading/page.tsx - handles accurately). Asking for coordinates
 * anyway would produce a confident-looking but likely-wrong overlay, which
 * is worse than a text-only description grounded in what the model can
 * actually and reliably do: describe what it sees in the real photo.
 *
 * Found live 2026-09-16: same "read as short/generic" feedback as
 * numerology-reading.ts (compared against Gemini's own, much deeper
 * answers) - rewritten for real depth (5-6+ sentences per line instead of
 * 1-2), still strictly bounded to what's actually visible in the real
 * photo (the depth increase is in the INTERPRETATION, never in inventing
 * additional observed detail beyond what the model actually states it
 * sees), plus a natural follow-up question.
 */
export type PalmLine = { name: string; observation: string; meaning: string };
export type PalmReading = {
  overview: string;
  handShape: string;
  lines: PalmLine[];
  summary: string;
  /** A natural follow-up question, varied per what's actually visible on this hand - not a fixed generic prompt. */
  followUpQuestion: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 4500;

export async function generatePalmReading(
  image: { data: string; mimeType: string },
  locale: AppLocale
): Promise<PalmReading> {
  const langName = LANG_NAME[locale];

  const system = `You are a traditional palmistry (hast rekha shastra) reader giving an in-depth reading, in the style of a real palmistry consultation - not a short summary. You will be shown one real photo of a person's palm. Describe ONLY what is actually visible in THIS photo - never invent a line, mount, or mark you cannot actually see; if a line (e.g. the fate line) is not clearly visible, say so rather than inventing one. The depth you add must come from a richer INTERPRETATION of what you see, never from inventing extra visual detail. Write entirely in ${langName}.

Hard rules, no exceptions: never give a health, medical, disease, or lifespan/death-related claim of any kind (this includes NOT interpreting the life line as predicting lifespan or health, a common traditional claim you must avoid) - redirect any health-adjacent observation to general vitality/energy framing instead. Never claim certainty about the future. Never give legal or financial advice. This is traditional interpretation for reflection, not a scientific or medical claim.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "overview": "3-4 sentences on the general hand shape/size/texture you actually observe",
  "handShape": "a traditional hand-type classification (e.g. Earth/Air/Water/Fire hand) based on what you observe, with 2-3 sentences of real reasoning why",
  "lines": [
    {"name": "Life Line", "observation": "2-3 sentences on exactly what you see - length, depth, curve, breaks, forks", "meaning": "at least 5-6 sentences of rich, specific traditional interpretation building on that exact observation - general vitality/energy framing only, never health/lifespan"},
    {"name": "Heart Line", "observation": "...", "meaning": "at least 5-6 sentences, same depth"},
    {"name": "Head Line", "observation": "...", "meaning": "at least 5-6 sentences, same depth"}
  ],
  "summary": "4-6 sentence warm, reflective wrap-up - not a certain prediction",
  "followUpQuestion": "one natural, warm follow-up question inviting the person to explore a specific related angle (e.g. a mount, career themes, relationship themes) - vary this based on what actually stands out on THIS specific hand, never the same generic question every time"
}

Only include a "Fate Line" or other additional line in "lines" if you can actually see it clearly in the photo - it is not present on every hand/photo and omitting it is correct when it is not visible, not an error.`;

  const result = await getAiProvider().complete({
    system,
    messages: [
      {
        role: "user",
        content: "Here is a real photo of my palm. Please give me a detailed, in-depth traditional palm reading based on exactly what you see.",
        image,
      },
    ],
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<PalmReading>;
  if (!parsed.overview || !parsed.lines?.length || !parsed.summary || !parsed.followUpQuestion) {
    throw new Error("AI response is missing required palm-reading fields");
  }
  return parsed as PalmReading;
}
