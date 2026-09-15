import { getAiProvider } from "./provider";
import type { KaalSarpDosha } from "@/lib/astrology/kaal-sarp";
import type { SadeSatiStatus } from "@/lib/astrology/sade-sati";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * mangal-dosha-reading.ts: strict JSON the UI renders into fixed cards.
 * Both real results (Kaal Sarp Dosha from real planetary positions, Sade
 * Sati from real current Saturn transit vs real natal Moon) are already
 * fully determined before this is called — this only ever explains and
 * gives calm context around them.
 *
 * Same hard safety framing as mangal-dosha-reading.ts (mirrors policy.ts's
 * FORBIDDEN_RULES, which this bypasses like every direct-complete()
 * feature): never fear tactics, never present either as certain
 * misfortune (Sade Sati especially is often over-dramatized in folk
 * belief — many classical and modern astrologers describe it as a period
 * of discipline/growth, not disaster), never instruct spending money on
 * remedies.
 */
export type DoshaTransitReading = {
  title: string;
  kaalSarpExplanation: string;
  sadeSatiExplanation: string;
  remedyNote: string;
  summary: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 2000;

export async function generateDoshaTransitReading(
  kaalSarp: KaalSarpDosha,
  sadeSati: SadeSatiStatus,
  remedies: string[],
  locale: AppLocale
): Promise<DoshaTransitReading> {
  const langName = LANG_NAME[locale];

  const system = `You write traditional Vedic guidance on Kaal Sarp Dosha and Sade Sati for Prerna AI. You are given ALREADY-DETERMINED real facts for both (whether Kaal Sarp Dosha is present, its real type/named form; whether Sade Sati is currently active, its real phase) plus a list of real traditional remedies — never question, recalculate, or invent any of these, only explain and give calm context around them. Write entirely in ${langName}.

Hard rules, no exceptions: never use fear tactics or present either result as certain misfortune. Sade Sati in particular is often over-dramatized in folk belief — many traditions describe it as a period calling for discipline, patience, and inner growth rather than disaster, and note that its real effect varies hugely by each person's full real chart, not this factor alone. Never instruct spending money on any remedy — present the real remedies given below only as optional reference information. Never give medical, legal, or financial advice. This is traditional practice for reflection, not certainty.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "title": "short warm title for this reading",
  "kaalSarpExplanation": "4-6 sentences on the real Kaal Sarp Dosha result given below, calm and without alarm - if not present, reassuringly say so",
  "sadeSatiExplanation": "4-6 sentences on the real Sade Sati result given below, framed as a period of growth/discipline if active, calm and without alarm - if not active, reassuringly say so",
  "remedyNote": "3-5 sentences introducing the real remedies given below as optional reference information, explicitly noting they are not a requirement",
  "summary": "2-3 sentence warm, reflective wrap-up"
}`;

  const kaalSarpText = kaalSarp.hasDosha
    ? `Present, type ${kaalSarp.type}${kaalSarp.namedType ? ` (${kaalSarp.namedType} Kaal Sarp Dosha)` : ""}.`
    : "Not present in this chart.";
  const sadeSatiText = sadeSati.isActive
    ? `Currently active, phase: ${sadeSati.phase} (Saturn is transiting the real sign ${sadeSati.saturnTransitSign}, relative to the real natal Moon sign ${sadeSati.moonSign}).`
    : `Not currently active (Saturn is transiting ${sadeSati.saturnTransitSign ?? "an undetermined sign"}, relative to the real natal Moon sign ${sadeSati.moonSign}).`;

  const userPrompt = `Real facts for this person:
Kaal Sarp Dosha: ${kaalSarpText}
Sade Sati: ${sadeSatiText}
Real traditional remedies (for both, general reference): ${remedies.join(" ")}

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

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<DoshaTransitReading>;
  if (!parsed.title || !parsed.kaalSarpExplanation || !parsed.sadeSatiExplanation || !parsed.remedyNote || !parsed.summary) {
    throw new Error("AI response is missing required dosha/transit fields");
  }
  return parsed as DoshaTransitReading;
}
