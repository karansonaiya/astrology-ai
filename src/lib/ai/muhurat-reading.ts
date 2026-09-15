import { getAiProvider } from "./provider";
import type { MuhuratVerdict } from "@/lib/astrology/muhurat";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * gemstone-reading.ts/numerology-reading.ts: strict JSON the UI renders into
 * fixed cards. Every real window/time given here was already determined by
 * getRealMuhuratVerdict (muhurat.ts) from real Prokerala data — this only
 * ever explains and recommends among windows it is given, never invents one.
 */
export type MuhuratReading = {
  title: string;
  recommendation: string;
  avoidNote: string;
  summary: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const EVENT_LABEL: Record<MuhuratVerdict["eventType"], string> = {
  general: "a general auspicious beginning",
  travel: "starting a journey/travel",
  business_start: "starting a business/new venture",
};
const MAX_OUTPUT_TOKENS = 1600;

export async function generateMuhuratReading(verdict: MuhuratVerdict, locale: AppLocale): Promise<MuhuratReading> {
  const langName = LANG_NAME[locale];

  const system = `You write traditional Vedic Muhurat (auspicious timing) guidance for Prerna AI. You are given ALREADY-DETERMINED real facts for one real date: the real favorable time windows (from real Choghadiya data), real windows to avoid (from real Rahu Kaal/inauspicious-period data), and the real Abhijit Muhurat window if one exists for that day — never question, recalculate, or invent a window; only explain and recommend among exactly the real windows given. Write entirely in ${langName}.

Hard rules, no exceptions: never claim a time window guarantees any outcome — frame everything as traditional auspicious-timing guidance for reflection and intention, not a guarantee. Never give medical, legal, or financial advice. If NO favorable windows are given, say so honestly rather than inventing one. This is traditional practice, not certainty.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "title": "short warm title for this day's muhurat guidance",
  "recommendation": "4-6 sentences: which of the given real favorable windows (name the actual window's real start-end time) is best for the stated purpose and why, mentioning Abhijit Muhurat if one was given",
  "avoidNote": "2-3 sentences naming the real windows to avoid (e.g. Rahu Kaal) and their real times, and that classical tradition avoids new beginnings during them",
  "summary": "2-3 sentence warm, reflective wrap-up"
}`;

  const favorableText = verdict.favorableWindows.length
    ? verdict.favorableWindows
        .map((w) => `${w.name} (${w.type}), ${w.start}–${w.end}${w.isSpecialForEvent ? " — traditionally especially recommended for this purpose" : ""}`)
        .join("; ")
    : "none found for this date";
  const avoidText = verdict.avoidWindows.length
    ? verdict.avoidWindows.map((w) => `${w.name}, ${w.start}–${w.end}`).join("; ")
    : "none found for this date";
  const abhijitText = verdict.abhijitWindow ? `${verdict.abhijitWindow.start}–${verdict.abhijitWindow.end}` : "not available for this date";

  const userPrompt = `Real facts for ${verdict.date}${verdict.vaara ? ` (${verdict.vaara})` : ""}, for the purpose of ${EVENT_LABEL[verdict.eventType]}:
Real favorable windows: ${favorableText}
Real windows to avoid: ${avoidText}
Real Abhijit Muhurat window: ${abhijitText}

Write the full guidance as specified, grounded in exactly these real facts.`;

  const result = await getAiProvider().complete({
    system,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<MuhuratReading>;
  if (!parsed.title || !parsed.recommendation || !parsed.avoidNote || !parsed.summary) {
    throw new Error("AI response is missing required muhurat fields");
  }
  return { title: parsed.title, recommendation: parsed.recommendation, avoidNote: parsed.avoidNote, summary: parsed.summary };
}
