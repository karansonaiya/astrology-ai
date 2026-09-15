import { getAiProvider } from "./provider";
import type { GemstoneRecommendation } from "@/lib/astrology/gemstones";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * numerology-reading.ts / palm-reading.ts for calling getAiProvider()
 * directly: strict JSON the UI renders into fixed cards. The gemstone/
 * Rudraksha itself and the real chart signals behind it are never decided
 * here — see gemstones.ts's header comment; this file only ever explains
 * and gives practical guidance around an already-determined real
 * recommendation.
 *
 * Hard safety framing, explicit in the prompt below (this bypasses
 * policy.ts, same accepted trade-off as the other direct-complete()
 * features): gemstones are a real financial purchase, sometimes an
 * expensive one, in a market with real scam risk — never claim a
 * guaranteed effect, always mention the much cheaper Rudraksha alternative,
 * always advise a real jeweler/professional before any purchase.
 */
export type GemstoneReading = {
  title: string;
  explanation: string;
  debilitatedNote: string | null;
  practicalGuidance: string;
  summary: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 1800;

export async function generateGemstoneReading(rec: GemstoneRecommendation, locale: AppLocale): Promise<GemstoneReading> {
  const langName = LANG_NAME[locale];

  const system = `You write traditional Vedic gemstone/Rudraksha guidance for Prerna AI. You are given ALREADY-DETERMINED real facts (the person's real Moon sign and its real ruling planet, the traditional gemstone/Rudraksha mukhi for that planet, and any real planets debilitated in their actual chart) — never question, recalculate, or change any of these, only explain and give guidance around them. Write entirely in ${langName}.

Hard rules, no exceptions: never claim a gemstone or Rudraksha guarantees any outcome (wealth, health, marriage, career success) — frame everything as "traditionally associated with" reflection and intention, not a guaranteed effect. Never give financial advice about gemstone investment value. Always mention that a Rudraksha bead is a real, much more affordable traditional alternative to a gemstone for the same planet. Always advise consulting a real, reputable jeweler/gemologist before buying any gemstone (real gemstones vary hugely in price and there is real risk of low-quality or synthetic stones being sold as genuine). Never give medical advice. This is traditional practice for reflection, not certainty.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "title": "short warm title for this recommendation",
  "explanation": "4-6 sentences: explain why this specific gemstone/Rudraksha is traditionally linked to this person's real Moon sign and its ruling planet",
  "debilitatedNote": "2-3 sentences on any real debilitated planet(s) given below and what tradition says about that, OR null if none are given - do not invent one",
  "practicalGuidance": "4-6 sentences: how this is traditionally worn/used, the real Rudraksha alternative, and the advice to consult a real jeweler before any purchase",
  "summary": "2-3 sentence warm, reflective wrap-up"
}`;

  const debilitatedText = rec.debilitatedPlanets.length
    ? rec.debilitatedPlanets.map((p) => `${p.planet} is debilitated (in ${p.sign})`).join("; ")
    : "none";

  const userPrompt = `Real facts for this person:
Moon sign (Rashi): ${rec.moonSign}
Ruling planet of the Moon sign: ${rec.rulingPlanet}
Traditional gemstone for this planet: ${rec.gemstone[locale]}
Traditional Rudraksha mukhi for this planet: ${rec.rudrakshaMukhi}-mukhi
Real debilitated planets in this chart: ${debilitatedText}

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

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<GemstoneReading>;
  if (!parsed.title || !parsed.explanation || !parsed.practicalGuidance || !parsed.summary) {
    throw new Error("AI response is missing required gemstone fields");
  }
  return {
    title: parsed.title,
    explanation: parsed.explanation,
    debilitatedNote: parsed.debilitatedNote ?? null,
    practicalGuidance: parsed.practicalGuidance,
    summary: parsed.summary,
  };
}
