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
 * The day's real transiting Moon nakshatra/tithi/yoga (from the panchang
 * provider, via horoscope-automation.ts's getDayAstroContext) — the actual
 * per-day signal that's missing if you just ask "write a daily horoscope for
 * Aries (today)" with nothing else: the model has no real difference to
 * react to, so every day's output converges on the same generic "take
 * initiative / be honest" tropes reworded slightly. Passing the real transit
 * gives it something concrete and genuinely different each day to ground the
 * reading in. null when the panchang lookup failed — generation still
 * proceeds, just without this grounding (see getDayAstroContext's comment).
 */
export type DayAstroContext = {
  dateStr: string; // "YYYY-MM-DD"
  vaara: string | null; // weekday name
  nakshatra: string | null;
  tithi: string | null;
  yoga: string | null;
  /**
   * Real transiting planets' whole-sign house AS SEEN FROM THIS SIGN (i.e.
   * treating the sign itself as the reference/Moon-sign, the standard basis
   * for a generic — not birth-chart-personalized — Vedic daily reading).
   * This is what actually makes sign X's reading differ from sign Y's on the
   * same day: same real planetary positions, different houses per sign.
   * null when the transit lookup failed — see getDayAstroContext.
   */
  transitHouses: { planet: string; house: number; retrograde: boolean }[] | null;
};

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
  locale: AppLocale,
  dayContext?: DayAstroContext | null
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
- Ground today's specific focus/tone in the real transit info given below (if any) instead of generic, could-apply-any-day advice — vary which life area gets the most attention based on it, so this reading is genuinely tied to today, not interchangeable with any other day's.
- Return ONLY strict JSON, no markdown fences, no commentary — exactly this shape:
{"career": "...", "love": "...", "money": "...", "wellness": "...", "luckyColor": "...", "luckyNumber": "...", "reflection": "..."}
Each of career/love/money/wellness/reflection: 2-3 sentences. luckyColor: one color word. luckyNumber: one number as a string.`;

  const dateLabel = dayContext?.dateStr ?? new Date().toISOString().slice(0, 10);
  const panchangLine = dayContext
    ? [
        dayContext.vaara ? `Day: ${dayContext.vaara}` : null,
        dayContext.nakshatra ? `Moon nakshatra: ${dayContext.nakshatra}` : null,
        dayContext.tithi ? `Tithi: ${dayContext.tithi}` : null,
        dayContext.yoga ? `Yoga: ${dayContext.yoga}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const houseLine = dayContext?.transitHouses?.length
    ? dayContext.transitHouses.map((t) => `${t.planet} in house ${t.house}${t.retrograde ? " (retrograde)" : ""}`).join(", ")
    : null;

  const userPrompt = `Write a ${period} horoscope for ${signLabel} (${PERIOD_LABEL[period]}, ${dateLabel}).${
    panchangLine ? `\nToday's real panchang: ${panchangLine}.` : ""
  }${
    houseLine
      ? `\nReal transit houses for ${signLabel} today (whole-sign, ${signLabel} as the 1st house): ${houseLine}. Base career/love/money/wellness on what these specific houses govern (e.g. a planet in the 10th house relates to career/status, 7th to relationships/partnerships, 2nd/11th to money, 6th to health/routine) — this is the actual astrological reasoning, not just a tone note.`
      : ""
  }${panchangLine || houseLine ? " Let this real data genuinely shape today's reading instead of generic advice that could apply to any day." : ""}`;

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
