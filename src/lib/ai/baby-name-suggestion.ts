import { getAiProvider } from "./provider";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * numerology-reading.ts / palm-reading.ts for calling getAiProvider()
 * directly: strict JSON the UI renders into fixed cards. The ONE real,
 * non-negotiable input here (the starting syllable) is never computed or
 * guessed here — see nakshatra-names.ts's header comment; this file's job
 * is purely to suggest real, actually-used names starting with that exact
 * given syllable, with honest meanings.
 */
export type BabyNameSuggestion = { name: string; meaning: string; gender: "boy" | "girl" | "unisex" };
export type BabyNameResult = { names: BabyNameSuggestion[]; note: string };

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

export async function generateBabyNameSuggestions(
  syllable: string,
  nakshatra: string,
  genderPreference: "boy" | "girl" | "any",
  count: number,
  locale: AppLocale
): Promise<BabyNameResult> {
  const langName = LANG_NAME[locale];
  const genderInstruction =
    genderPreference === "any"
      ? "Include a mix of boy names, girl names, and unisex names."
      : `Focus on ${genderPreference} names (a few unisex names are fine too, clearly marked).`;

  const system = `You suggest real, traditional Indian baby names for Prerna AI, grounded in Vedic Nakshatra-based naming (Namakaran). You are given ONE real, already-determined starting syllable/sound — every single name you suggest MUST genuinely start with that exact syllable (not just the same first letter or a similar-sounding syllable — the exact sound), no exceptions (e.g. if the syllable is "Chi", "Chitra" qualifies but "Chaitra" or "Cheena" do NOT, because they start with a different syllable even though they share the first letter). Only suggest real names that are actually used in India (not invented or fictional-sounding names). Give the honest, commonly-understood traditional meaning of each name; if you are not fully certain of a name's exact etymology, give the general widely-understood meaning rather than inventing false specificity. Never claim a name guarantees any outcome in the child's life — this is a naming tradition, not a prediction. Write the "name" field ALWAYS in plain Roman/Latin script regardless of the response language below (so it can be checked against the given syllable, which is also always in Roman script) — only "meaning" and "note" should be written in the target language.

Write "meaning" and "note" entirely in ${langName}.

${genderInstruction}

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "names": [
    {"name": "...", "meaning": "1 short sentence, honest", "gender": "boy" | "girl" | "unisex"}
  ],
  "note": "1-2 warm sentences about this Nakshatra-based naming tradition"
}`;

  // Ask for a few more than needed — the post-generation filter below drops
  // any name that doesn't actually pass the exact-syllable check (found
  // live: the model occasionally suggests a same-first-letter-but-wrong-
  // syllable name, e.g. "Chaitra" for a "Chi" syllable — real, so caught
  // in code rather than just trusted from the prompt alone).
  const requestCount = count + Math.max(3, Math.ceil(count * 0.3));

  const userPrompt = `The real starting syllable for this baby (born under the ${nakshatra} nakshatra) is: "${syllable}"

Suggest ${requestCount} real Indian names that genuinely start with this exact syllable/sound.`;

  const result = await getAiProvider().complete({
    system,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: requestCount > 15 ? 4000 : 1800,
  });

  const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<BabyNameResult>;
  if (!parsed.names?.length || !parsed.note) throw new Error("AI response is missing required baby-name fields");

  const normalizedSyllable = syllable.trim().toLowerCase();
  const verifiedNames = parsed.names.filter((n) => n.name?.trim().toLowerCase().startsWith(normalizedSyllable)).slice(0, count);
  if (!verifiedNames.length) throw new Error(`No suggested names actually started with the required syllable "${syllable}"`);

  return { names: verifiedNames, note: parsed.note };
}
