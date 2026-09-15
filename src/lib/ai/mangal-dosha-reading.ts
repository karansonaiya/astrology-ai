import { getAiProvider } from "./provider";
import type { MangalDosha } from "@/lib/astrology/adapter";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * gemstone-reading.ts/muhurat-reading.ts: strict JSON the UI renders into
 * fixed cards. The Mangal Dosha determination itself (hasDosha, severity,
 * description, exceptions, remedies) is never decided here — it's real,
 * already-computed Prokerala data (see adapter.ts's MangalDosha type) —
 * this only ever explains and gives calm context around it.
 *
 * Hard safety framing (mirrors policy.ts's existing FORBIDDEN_RULES, which
 * this bypasses like every other direct-complete() feature — same accepted
 * trade-off as gemstone/muhurat): never use fear tactics or treat this as a
 * certain misfortune, always mention that real exceptions can reduce/
 * cancel the effect when Prokerala's own data says so, never instruct
 * spending money on remedies (remedies are shown as real traditional
 * reference text, not a call to action), always frame marriage
 * compatibility as depending on many real factors, not this one alone.
 */
export type MangalDoshaReading = {
  title: string;
  explanation: string;
  exceptionNote: string | null;
  remedyNote: string;
  summary: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 1800;

export async function generateMangalDoshaReading(dosha: MangalDosha, locale: AppLocale): Promise<MangalDoshaReading> {
  const langName = LANG_NAME[locale];

  const system = `You write traditional Vedic Mangal Dosha (Manglik) guidance for Prerna AI. You are given ALREADY-DETERMINED real facts (whether this person's real chart has Mangal Dosha, its real severity, Prokerala's own real description, any real classical exceptions that reduce/cancel it, and real traditional remedies) — never question, recalculate, or invent any of these, only explain and give calm context around them. Write entirely in ${langName}.

Hard rules, no exceptions: never use fear tactics or present this as a certain misfortune — many traditions consider a mild dosha with valid exceptions to have minimal real impact. If real exceptions are given below, always mention them and their calming effect. Never instruct the person to spend money on any remedy — present remedies only as real traditional reference information, explicitly optional, never a requirement to avoid misfortune. Never claim marriage compatibility depends on this factor alone — always note that communication, values, and many other real factors matter at least as much. Never give medical, legal, or financial advice. This is traditional practice for reflection, not certainty.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "title": "short warm title for this reading",
  "explanation": "4-6 sentences: explain what the real result (dosha present or not, real severity, real description) traditionally means, calmly and without alarm",
  "exceptionNote": "2-3 sentences on the real exceptions given below and their traditional calming effect, OR null if none are given - do not invent one",
  "remedyNote": "3-5 sentences introducing the real traditional remedies given below as optional reference information, explicitly noting they are not a requirement and a knowledgeable priest/astrologer should be consulted before undertaking any of them - if no dosha was found, instead write 2-3 reassuring sentences with no remedies needed",
  "summary": "2-3 sentence warm, reflective wrap-up noting that real compatibility depends on many factors beyond this one"
}`;

  const exceptionsText = dosha.exceptions.length ? dosha.exceptions.join(" ") : "none given";
  const remediesText = dosha.remedies.length ? dosha.remedies.join(" ") : "none given";

  const userPrompt = `Real facts for this person's real chart:
Mangal Dosha present: ${dosha.hasDosha ? "yes" : "no"}
Real severity: ${dosha.severity ?? "not applicable"}
Real description (from the provider): ${dosha.description ?? "not applicable"}
Real exceptions: ${exceptionsText}
Real traditional remedies: ${remediesText}

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

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<MangalDoshaReading>;
  if (!parsed.title || !parsed.explanation || !parsed.remedyNote || !parsed.summary) {
    throw new Error("AI response is missing required Mangal Dosha fields");
  }
  return {
    title: parsed.title,
    explanation: parsed.explanation,
    exceptionNote: parsed.exceptionNote ?? null,
    remedyNote: parsed.remedyNote,
    summary: parsed.summary,
  };
}
