/**
 * Numerology — unlike palm-line tracing or even astrology's planetary
 * positions (which need a real ephemeris/API), every number here is 100%
 * deterministic arithmetic on the real name/birthdate given: no API call,
 * no AI guess, no possibility of inventing a wrong number. The AI layer
 * (numerology-reading.ts) only ever INTERPRETS these real, independently-
 * verifiable numbers — never computes or overrides them.
 *
 * Pythagorean system (the most common Western numerology letter-value
 * mapping) — a different tradition (Chaldean) uses different letter
 * values; this app uses Pythagorean throughout, consistently.
 */
const LETTER_VALUES: Record<string, number> = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/**
 * Digit-sum reduction, stopping early at a "master number" (11, 22, 33) —
 * traditionally treated as significant in their own right rather than
 * reduced further, e.g. 29 -> 2+9=11 stops at 11, not reduced to 2.
 */
function reduceToDigitOrMaster(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split("")
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

function sumDigits(n: number): number {
  return String(n)
    .split("")
    .reduce((sum, d) => sum + Number(d), 0);
}

export type NumerologyNumbers = {
  lifePath: number;
  destiny: number;
  soulUrge: number;
  personality: number;
  birthday: number;
};

/** birthDate: a real Date (UTC midnight, same convention as BirthProfile.birthDate elsewhere in this app). name: full name, letters only are counted. */
export function calculateNumerology(name: string, birthDate: Date): NumerologyNumbers {
  const day = birthDate.getUTCDate();
  const month = birthDate.getUTCMonth() + 1;
  const year = birthDate.getUTCFullYear();

  // Life Path: day, month, and year are each reduced separately first
  // (the standard method), then the three results are summed and reduced
  // again - not simply summing every raw digit of the date at once.
  const lifePath = reduceToDigitOrMaster(
    reduceToDigitOrMaster(day) + reduceToDigitOrMaster(month) + reduceToDigitOrMaster(sumDigits(year))
  );

  const letters = name.toLowerCase().split("").filter((c) => LETTER_VALUES[c] != null);
  const destiny = reduceToDigitOrMaster(letters.reduce((sum, c) => sum + LETTER_VALUES[c], 0));
  const soulUrge = reduceToDigitOrMaster(
    letters.filter((c) => VOWELS.has(c)).reduce((sum, c) => sum + LETTER_VALUES[c], 0)
  );
  const personality = reduceToDigitOrMaster(
    letters.filter((c) => !VOWELS.has(c)).reduce((sum, c) => sum + LETTER_VALUES[c], 0)
  );
  const birthday = reduceToDigitOrMaster(day);

  return { lifePath, destiny, soulUrge, personality, birthday };
}

// Traditionally treated as significant "before" being reduced to a final
// single digit — flagged (not reduced away silently) rather than invented;
// this is a real, well-established extension of the same Pythagorean
// system, still 100% deterministic arithmetic.
const KARMIC_DEBT_NUMBERS = new Set([13, 14, 16, 19]);

export type DetailedNumerologyNumbers = NumerologyNumbers & {
  /** reduce(lifePath + destiny) — the traditional "Maturity" number. */
  maturity: number;
  /** Changes every calendar year by design — computed against referenceDate (defaults to now), not birthDate. */
  personalYear: number;
  /** Empty if none of the core calculations' pre-reduction sums hit a karmic debt number. */
  karmicDebtNumbers: number[];
};

/**
 * The paid-tier depth layer on top of calculateNumerology's free 5 numbers —
 * still 100% deterministic arithmetic, zero AI/guesswork, same as the free
 * calculation. Kept as a separate function (rather than changing
 * calculateNumerology itself) so the already-verified free path is never
 * touched by this paid-tier work.
 */
export function calculateDetailedNumerology(
  name: string,
  birthDate: Date,
  referenceDate: Date = new Date()
): DetailedNumerologyNumbers {
  const base = calculateNumerology(name, birthDate);

  const day = birthDate.getUTCDate();
  const month = birthDate.getUTCMonth() + 1;
  const year = birthDate.getUTCFullYear();
  const letters = name.toLowerCase().split("").filter((c) => LETTER_VALUES[c] != null);

  const karmicDebtNumbers = new Set<number>();
  const flagIfKarmicDebt = (rawSum: number) => {
    if (KARMIC_DEBT_NUMBERS.has(rawSum)) karmicDebtNumbers.add(rawSum);
  };
  flagIfKarmicDebt(letters.reduce((sum, c) => sum + LETTER_VALUES[c], 0)); // destiny's raw sum
  flagIfKarmicDebt(letters.filter((c) => VOWELS.has(c)).reduce((sum, c) => sum + LETTER_VALUES[c], 0)); // soul urge's raw sum
  flagIfKarmicDebt(letters.filter((c) => !VOWELS.has(c)).reduce((sum, c) => sum + LETTER_VALUES[c], 0)); // personality's raw sum
  flagIfKarmicDebt(reduceToDigitOrMaster(day) + reduceToDigitOrMaster(month) + reduceToDigitOrMaster(sumDigits(year))); // life path's pre-final-reduce sum

  const maturity = reduceToDigitOrMaster(base.lifePath + base.destiny);

  const refYear = referenceDate.getUTCFullYear();
  const personalYear = reduceToDigitOrMaster(
    reduceToDigitOrMaster(day) + reduceToDigitOrMaster(month) + reduceToDigitOrMaster(sumDigits(refYear))
  );

  return { ...base, maturity, personalYear, karmicDebtNumbers: [...karmicDebtNumbers] };
}
