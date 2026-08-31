import { getAiProvider } from "./provider";
import type { AppLocale } from "@/lib/i18n/config";
import { ZODIAC_LABELS, type ZodiacSign } from "@/lib/zodiac";

// Deliberately NOT the shared AI_MAX_OUTPUT_TOKENS (tuned tight for short
// chat replies) — 7 fields of prose ran into that cap and got cut off
// mid-JSON before the closing brace (observed live: Gemini 2.5 Flash's
// internal "thinking" tokens also count against maxOutputTokens, eating
// into the visible-output budget). This isn't a latency-sensitive path
// (an admin bulk-generate action), so there's room to give it more.
const MAX_OUTPUT_TOKENS = 2000;

export type HoroscopeDraftFields = {
  career: string;
  love: string;
  money: string;
  wellness: string;
  luckyColor: string;
  luckyNumber: string;
  reflection: string;
};

const REQUIRED_FIELDS: (keyof HoroscopeDraftFields)[] = [
  "career",
  "love",
  "money",
  "wellness",
  "luckyColor",
  "luckyNumber",
  "reflection",
];

const PERIOD_LABEL = { daily: "today", weekly: "this week", monthly: "this month" } as const;

/**
 * Generates one horoscope's worth of section text via the configured AI
 * provider — content that always lands as a "draft" row, never published
 * automatically (see the admin content route: publishing is a deliberate,
 * separate human action). This just replaces "an admin hand-writes 12 signs
 * from scratch" with "an admin reviews and publishes an AI-written draft."
 *
 * No DISCLOSURE sentence is appended here (unlike chat replies) — each
 * section is short structured text, and the public horoscope page already
 * shows a static "not a certain prediction" disclaimer above the grid.
 */
export async function generateHoroscopeDraft(
  sign: ZodiacSign,
  period: "daily" | "weekly" | "monthly",
  locale: AppLocale
): Promise<HoroscopeDraftFields> {
  const langName = { en: "English", hi: "Hindi", gu: "Gujarati" }[locale];
  const signLabel = ZODIAC_LABELS[sign][locale];

  const system = `You write horoscope content for an astrology app, in ${langName}. Follow these hard rules, always:
- Never claim certainty about the future ("you will definitely...", "100% certain").
- Never use fear tactics, invented doshas, curses, or claims of inevitable disaster.
- Never give medical, legal, investment, or trading advice, and never predict markets.
- Never tell the reader to spend money on rituals/remedies, or to make a major life decision solely on this.
- Keep tone warm, calm, encouraging, and never overly mystical or jargon-heavy.
- Write only in ${langName}.
- Return ONLY strict JSON, no markdown fences, no commentary — exactly this shape:
{"career": "...", "love": "...", "money": "...", "wellness": "...", "luckyColor": "...", "luckyNumber": "...", "reflection": "..."}
Each of career/love/money/wellness/reflection: 2-3 sentences. luckyColor: one color word. luckyNumber: one number as a string.`;

  const userPrompt = `Write a ${period} horoscope for ${signLabel} (${PERIOD_LABEL[period]}).`;

  const provider = getAiProvider();
  const result = await provider.complete({
    system,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  const parsed = parseDraftJson(result.text);
  for (const field of REQUIRED_FIELDS) {
    if (!parsed[field] || !parsed[field].trim()) {
      throw new Error(`AI response for ${sign}/${period}/${locale} is missing "${field}"`);
    }
  }
  return parsed;
}

function parseDraftJson(text: string): HoroscopeDraftFields {
  // Models occasionally wrap JSON in ```json fences despite instructions —
  // strip those before parsing rather than failing the whole generation.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${cleaned.slice(0, 200)}`);
  }
  return obj as HoroscopeDraftFields;
}
