import { getAiProvider } from "./provider";
import { calculateNumerologyRawComponents, type NumerologyNumbers } from "@/lib/numerology/calculate";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Same "controlled task+data prompt, not free-form chat" reasoning as
 * kundli-explanation.ts / palm-reading.ts for calling getAiProvider()
 * directly: strict JSON the UI renders into fixed cards. The numbers
 * themselves are never computed or adjusted here - only interpreted (see
 * calculate.ts's header comment on why they're 100% deterministic math,
 * not an AI guess).
 *
 * Found live 2026-09-16: the founder compared this against Gemini's own
 * numerology answers (via Google Search's AI mode) and correctly flagged
 * that ours read short and generic (3-4 sentences, no visible working)
 * next to Gemini's much deeper style - each number explained with its
 * actual calculation spelled out, then several sentences of real
 * interpretation, ending with a natural next question. Rewritten to match
 * that depth: `raw` below is the exact real arithmetic behind each number
 * (calculate.ts's calculateNumerologyRawComponents) handed to the model as
 * GIVEN FACTS to narrate accurately - never left for the model to
 * reconstruct/guess from just the final number, which an LLM is not
 * reliably correct at and would risk narrating a plausible-looking but
 * wrong calculation. This is also the real fix for "everyone gets the same
 * reading" - showing each person's actual real digits/letters makes every
 * reading visibly, provably specific to them.
 */
export type NumerologyMeaning = { number: number; title: string; meaning: string };
export type NumerologyReading = {
  lifePath: NumerologyMeaning;
  destiny: NumerologyMeaning;
  soulUrge: NumerologyMeaning;
  personality: NumerologyMeaning;
  birthday: NumerologyMeaning;
  summary: string;
  /** A natural follow-up question, varied per person's actual numbers - not a fixed generic prompt. */
  followUpQuestion: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 4000;

export async function generateNumerologyReading(
  name: string,
  birthDate: Date,
  numbers: NumerologyNumbers,
  locale: AppLocale
): Promise<NumerologyReading> {
  const langName = LANG_NAME[locale];
  const raw = calculateNumerologyRawComponents(name, birthDate);

  const system = `You write in-depth traditional Pythagorean numerology readings, in the detailed, engaging style of a real numerology consultation - not a short summary. You are given five ALREADY-CALCULATED real numbers, and the exact real arithmetic behind each one - never question, recalculate, or alter any of these, only narrate the calculation accurately and then interpret it. Never give medical, legal, or financial advice, never claim certainty about the future, never use fear tactics. This is traditional interpretation for reflection, not certainty. Write entirely in ${langName}.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "lifePath": {"title": "short traditional title for this Life Path number", "meaning": "at least 6 sentences: first accurately state the real calculation given below in plain language, then a rich, specific, in-depth traditional interpretation - go well beyond a short summary"},
  "destiny": {"title": "...", "meaning": "at least 6 sentences, same structure: real calculation first, then deep interpretation"},
  "soulUrge": {"title": "...", "meaning": "at least 6 sentences, same structure"},
  "personality": {"title": "...", "meaning": "at least 6 sentences, same structure"},
  "birthday": {"title": "...", "meaning": "at least 4 sentences, same structure"},
  "summary": "4-6 sentence warm, reflective wrap-up tying all five numbers together",
  "followUpQuestion": "one natural, warm follow-up question inviting the person to explore a specific related angle - vary this based on what actually stands out in THEIR numbers (e.g. a master number, a repeated number, a striking contrast between two numbers), never the same generic question every time"
}`;

  const userPrompt = `Here are the real calculated numerology numbers for "${name}" (born ${birthDate.toISOString().slice(0, 10)}), with the exact real arithmetic behind each one - use these exact facts when narrating each calculation, never alter or re-derive them:

Life Path Number: ${numbers.lifePath}
  Real calculation: birth day ${raw.day} reduces to ${raw.dayReduced}; birth month ${raw.month} reduces to ${raw.monthReduced}; birth year ${raw.year} (digit sum ${raw.yearDigitSum}) reduces to ${raw.yearReduced}; ${raw.dayReduced}+${raw.monthReduced}+${raw.yearReduced} reduces to ${numbers.lifePath}.

Destiny (Expression) Number: ${numbers.destiny}
  Real calculation: every letter in the full name "${name}" is converted to its Pythagorean letter value and summed to ${raw.destinyRawSum}, which reduces to ${numbers.destiny}.

Soul Urge Number: ${numbers.soulUrge}
  Real calculation: only the vowels in "${name}" are converted to their letter values and summed to ${raw.soulUrgeRawSum}, which reduces to ${numbers.soulUrge}.

Personality Number: ${numbers.personality}
  Real calculation: only the consonants in "${name}" are converted to their letter values and summed to ${raw.personalityRawSum}, which reduces to ${numbers.personality}.

Birthday Number: ${numbers.birthday}
  Real calculation: birth day ${raw.day} reduces to ${numbers.birthday}.

Write the full reading as specified - genuinely in-depth, not a short summary, the way a real numerology consultation would explain each number.`;

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
    followUpQuestion?: string;
  };
  if (
    !parsed.lifePath ||
    !parsed.destiny ||
    !parsed.soulUrge ||
    !parsed.personality ||
    !parsed.birthday ||
    !parsed.summary ||
    !parsed.followUpQuestion
  ) {
    throw new Error("AI response is missing required numerology fields");
  }

  return {
    lifePath: { number: numbers.lifePath, ...parsed.lifePath },
    destiny: { number: numbers.destiny, ...parsed.destiny },
    soulUrge: { number: numbers.soulUrge, ...parsed.soulUrge },
    personality: { number: numbers.personality, ...parsed.personality },
    birthday: { number: numbers.birthday, ...parsed.birthday },
    summary: parsed.summary,
    followUpQuestion: parsed.followUpQuestion,
  };
}
