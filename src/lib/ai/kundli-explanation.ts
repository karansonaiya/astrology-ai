import { getAiProvider } from "./provider";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * "Explain my full kundli" — a deep, multi-section AI reading (personality,
 * mind/emotions, money, career, relationship, home/family, education,
 * spiritual side, strongest combination, biggest challenges, short
 * summary), grounded in the REAL calculated chart (see
 * src/lib/astrology/adapter.ts's summarizeKundliForAi / the "ground chat in
 * real chart data" fix) rather than the AI guessing from a birth date.
 * Structured JSON output (not loose markdown) so the UI can render it with
 * consistent icons/cards rather than depending on whatever formatting the
 * model happens to produce.
 *
 * Calls getAiProvider() directly rather than generateAstrologyReply() —
 * same reason as horoscope-content.ts: this isn't classifying free-form
 * user input, it's a controlled task+data prompt we construct ourselves.
 * Found live (real bug, not theoretical): running this chart data through
 * generateAstrologyReply's safety classifier false-positived on the medical
 * keyword regex, because "cancer" (the disease trigger word) also matches
 * "Cancer" the zodiac sign whenever a planet happens to sit there — e.g.
 * "Saturn in cancer, 7th house" got the whole request redirected to the
 * medical-safety response instead of generating a reading. That regex
 * collision is a pre-existing issue in safety.ts's classifier (could
 * misfire the same way on a live chat message that mentions "cancer" as a
 * sign) — flagged separately, not fixed here to avoid a rushed change to
 * safety-classification code. Trade-off of bypassing here: no AiUsageLog
 * cost-tracking entry for this feature (same accepted trade-off as
 * horoscope-content.ts) — the hard content rules (no medical/legal/
 * financial advice, no certainty claims, never invent data) are still
 * enforced, just inlined below instead of via policy.ts.
 */

export type ExplanationSection = {
  icon: string; // a single emoji
  title: string;
  paragraphs: string[]; // 1-3 short paragraphs
  bullets?: string[];
  highlight?: string; // one bolded "biggest advice"/callout line for this section
};

export type KundliExplanation = {
  intro: string;
  sections: ExplanationSection[];
  strongestCombination: { points: { title: string; desc: string }[]; summary: string };
  challenges: { items: string[]; note: string };
  shortSummary: string;
};

export type ExplainablePlanet = { planet: string; sign: string; house: number | null; retrograde: boolean };
export type ExplainableChart = {
  sunSign: string | null;
  moonSign: string | null;
  ascendant: string | null;
  nakshatra: string | null;
  planetaryPositions: ExplainablePlanet[] | null;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

function describeChart(chart: ExplainableChart): string {
  const parts = [
    `Ascendant (Lagna): ${chart.ascendant ?? "unknown"}`,
    `Sun sign: ${chart.sunSign ?? "unknown"}`,
    `Moon sign: ${chart.moonSign ?? "unknown"}`,
    `Nakshatra: ${chart.nakshatra ?? "unknown"}`,
  ];
  if (chart.planetaryPositions?.length) {
    const planets = chart.planetaryPositions
      .map((p) => `${p.planet} in ${p.sign}${p.house ? `, house ${p.house}` : ""}${p.retrograde ? " (retrograde)" : ""}`)
      .join("; ");
    parts.push(`Planetary positions: ${planets}`);
  }
  return parts.join("\n");
}

export async function generateKundliExplanation(
  chart: ExplainableChart,
  locale: AppLocale,
  userId?: string,
  subjectName?: string
): Promise<KundliExplanation> {
  void userId; // kept in the signature for the caller's future use (e.g. if usage logging is added back) — unused now that we bypass generateAstrologyReply
  const langName = LANG_NAME[locale];
  const who = subjectName ? `for ${subjectName}` : "for the reader";

  const system = `You write deep, well-structured Vedic astrology chart readings ${who}, in ${langName}, using ONLY the real calculated chart data given to you (never invent placements). Ground every claim in a specific real placement (e.g. "Mars in Aries, 1st house" — not a generic guess). Keep the traditional-astrology framing honest: this is traditional interpretation, not scientific certainty or a guaranteed prediction. Never give medical, legal, or financial advice, never claim certainty about the future, never use fear tactics, never produce hateful or discriminatory content.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "intro": "1-2 sentences naming the ascendant sign and framing this as a traditional reading, not certain prediction",
  "sections": [
    {"icon": "👤", "title": "Personality — <ascendant sign> Lagna + <its ruling planet>'s placement", "paragraphs": ["..."], "bullets": ["...", "..."], "highlight": "one short bolded-style callout line"},
    {"icon": "🧠", "title": "Mind & Emotions — <Moon sign>", "paragraphs": ["..."], "bullets": ["..."]},
    {"icon": "💰", "title": "Money", "paragraphs": ["..."], "bullets": ["..."]},
    {"icon": "💼", "title": "Career", "paragraphs": ["..."], "bullets": ["..."]},
    {"icon": "❤️", "title": "Relationship", "paragraphs": ["..."], "bullets": ["..."], "highlight": "one short relationship-advice callout"},
    {"icon": "🏠", "title": "Home / Family", "paragraphs": ["..."], "bullets": ["..."]},
    {"icon": "🎓", "title": "Education / Intelligence", "paragraphs": ["..."], "bullets": ["..."]},
    {"icon": "🌍", "title": "Foreign / Spiritual side", "paragraphs": ["..."], "bullets": ["..."]}
  ],
  "strongestCombination": {
    "points": [{"title": "e.g. Mars in Aries, 1st house", "desc": "short phrase"}, ...2-3 of these],
    "summary": "one quoted, punchy sentence synthesizing the person's core nature"
  },
  "challenges": {"items": ["short phrase", "short phrase", ...3-5 of these], "note": "one sentence on turning these into strengths with self-awareness"},
  "shortSummary": "a 3-4 sentence plain-language wrap-up of the whole chart"
}

Every section's "title" must name the specific real placement it's based on (sign + house where relevant). Each section: 2-4 sentences across "paragraphs", plus 3-6 short "bullets". Base EVERY section on the actual planets/houses given — a person with Venus in Libra should get different Relationship content than one with Venus in Scorpio. Write entirely in ${langName}.`;

  const userPrompt = `Here is the real calculated Vedic birth chart (Lahiri ayanamsa) ${who}:\n${describeChart(chart)}\n\nWrite the full structured reading as specified.`;

  // 8 sections + strongest-combination + challenges is a lot of structured
  // content — 4500 wasn't enough (found live: truncated mid-JSON). Gemini's
  // internal "thinking" tokens also eat into this budget (see
  // horoscope-content.ts), so the real headroom is smaller than it looks.
  const result = await getAiProvider().complete({
    system,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 8000,
  });

  return parseExplanationJson(result.text);
}

function parseExplanationJson(text: string): KundliExplanation {
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

  const parsed = obj as Partial<KundliExplanation>;
  if (!parsed.sections?.length || !parsed.shortSummary) {
    throw new Error("AI response is missing required kundli-explanation fields");
  }
  return parsed as KundliExplanation;
}
