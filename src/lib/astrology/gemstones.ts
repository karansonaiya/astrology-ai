import type { ZodiacSign } from "@prisma/client";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Traditional Vedic astrology's planet <-> gemstone / Rudraksha mukhi
 * associations — real, standard, universally-cited classical knowledge
 * (the same "static lookup, not invented, not AI-guessed" status as
 * PLANET_LABELS/ZODIAC_LABELS elsewhere in this app — see interpretations.ts's
 * header comment for the same reasoning), not something any astrology API
 * provides as data since it's fixed tradition, not a per-chart calculation.
 *
 * What IS per-chart and real is which planet the recommendation is based
 * on: the real ruling planet (RASHI_LORD) of the person's real Moon sign
 * (Rashi) — the traditional, most widely-practiced default ("Rashi Ratna"),
 * safer/more universally agreed than a Lagna-based or dasha-based pick —
 * plus a defensible, classically-fixed exaltation/debilitation check
 * against the person's real planetary sign placements as a secondary,
 * genuinely-computed signal.
 */
type L = Record<AppLocale, string>;

export const RASHI_LORD: Record<ZodiacSign, string> = {
  aries: "Mars",
  taurus: "Venus",
  gemini: "Mercury",
  cancer: "Moon",
  leo: "Sun",
  virgo: "Mercury",
  libra: "Venus",
  scorpio: "Mars",
  sagittarius: "Jupiter",
  capricorn: "Saturn",
  aquarius: "Saturn",
  pisces: "Jupiter",
};

export const PLANET_GEMSTONE: Record<string, L> = {
  Sun: { en: "Ruby (Manik)", hi: "माणिक (Ruby)", gu: "માણેક (Ruby)" },
  Moon: { en: "Pearl (Moti)", hi: "मोती (Pearl)", gu: "મોતી (Pearl)" },
  Mars: { en: "Red Coral (Moonga)", hi: "मूंगा (Red Coral)", gu: "પરવાળું (Red Coral)" },
  Mercury: { en: "Emerald (Panna)", hi: "पन्ना (Emerald)", gu: "પન્ના (Emerald)" },
  Jupiter: { en: "Yellow Sapphire (Pukhraj)", hi: "पुखराज (Yellow Sapphire)", gu: "પોખરાજ (Yellow Sapphire)" },
  Venus: { en: "Diamond or White Sapphire (Heera)", hi: "हीरा (Diamond)", gu: "હીરો (Diamond)" },
  Saturn: { en: "Blue Sapphire (Neelam)", hi: "नीलम (Blue Sapphire)", gu: "નીલમ (Blue Sapphire)" },
  Rahu: { en: "Hessonite (Gomed)", hi: "गोमेद (Hessonite)", gu: "ગોમેદ (Hessonite)" },
  Ketu: { en: "Cat's Eye (Lehsunia)", hi: "लहसुनिया (Cat's Eye)", gu: "લસણિયો (Cat's Eye)" },
};

export const PLANET_RUDRAKSHA_MUKHI: Record<string, number> = {
  Sun: 1,
  Moon: 2,
  Mars: 3,
  Mercury: 4,
  Jupiter: 5,
  Venus: 6,
  Saturn: 7,
  Rahu: 8,
  Ketu: 9,
};

// Fixed, undisputed across classical texts for the 7 classical grahas —
// Rahu/Ketu's exaltation/debilitation signs vary by text, so deliberately
// excluded from this check rather than picking a disputed version.
const EXALTATION_SIGN: Record<string, ZodiacSign> = {
  Sun: "aries",
  Moon: "taurus",
  Mars: "capricorn",
  Mercury: "virgo",
  Jupiter: "cancer",
  Venus: "pisces",
  Saturn: "libra",
};
const DEBILITATION_SIGN: Record<string, ZodiacSign> = {
  Sun: "libra",
  Moon: "scorpio",
  Mars: "cancer",
  Mercury: "pisces",
  Jupiter: "capricorn",
  Venus: "virgo",
  Saturn: "aries",
};

export type PlanetDignity = "exalted" | "debilitated" | "neutral";

export function getPlanetDignity(planet: string, sign: ZodiacSign): PlanetDignity {
  if (EXALTATION_SIGN[planet] === sign) return "exalted";
  if (DEBILITATION_SIGN[planet] === sign) return "debilitated";
  return "neutral";
}

export type GemstoneRecommendation = {
  moonSign: ZodiacSign;
  rulingPlanet: string;
  gemstone: L;
  rudrakshaMukhi: number;
  /** Real, classically-computed — any of this person's real planets that are debilitated in their real chart. Empty array is a valid, common, non-error result. */
  debilitatedPlanets: { planet: string; sign: ZodiacSign }[];
};

export function getRealGemstoneRecommendation(
  moonSign: ZodiacSign,
  planetaryPositions: { planet: string; sign: ZodiacSign }[]
): GemstoneRecommendation {
  const rulingPlanet = RASHI_LORD[moonSign];
  const debilitatedPlanets = planetaryPositions
    .filter((p) => getPlanetDignity(p.planet, p.sign) === "debilitated")
    .map((p) => ({ planet: p.planet, sign: p.sign }));

  return {
    moonSign,
    rulingPlanet,
    gemstone: PLANET_GEMSTONE[rulingPlanet],
    rudrakshaMukhi: PLANET_RUDRAKSHA_MUKHI[rulingPlanet],
    debilitatedPlanets,
  };
}
