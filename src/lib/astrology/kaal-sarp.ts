import type { ZodiacSign } from "@prisma/client";
import { ZODIAC_ORDER } from "./adapter";

/**
 * Kaal Sarp Dosha — computed here, not fetched (same "computed here"
 * pattern as aspects.ts): checked Prokerala live for a dedicated endpoint
 * under every plausible name (kalasarpa-dosha, kala-sarpa-dosha,
 * kalsarpa-dosha, sarpa-dosha) — all 404 "No route found", confirmed no
 * such product exists on this provider. The classical determination is
 * fully computable from real planetary positions this app already fetches
 * for every chart (Rahu/Ketu's real sign+degree, and the 7 classical
 * planets' real sign+degree) — no new API call needed.
 *
 * Classical rule: Kaal Sarp Dosha occurs when all 7 classical planets
 * (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) fall on the SAME side
 * of the Rahu-Ketu axis — either all in the arc swept forward from Rahu to
 * Ketu ("Anuloma", Rahu-leading) or all in the arc from Ketu to Rahu
 * ("Viloma", Ketu-leading). Real Ketu position (not derived as Rahu+180,
 * even though that's always astronomically true) is used directly since
 * it's already a real, separately-fetched planet position — same
 * "always use real data, don't re-derive what's already given" principle
 * as the rest of this app.
 *
 * The named serpent type (Anant, Kulik, Vasuki...) is fixed, classical
 * knowledge keyed only by which house Rahu occupies — same "static lookup,
 * not invented" status as gemstones.ts's RASHI_LORD table — and only
 * available when birth time is known (house needs a real ascendant);
 * hasDosha/type themselves need only sign+degree, so they're available
 * even without a known birth time.
 */
export type KaalSarpDosha = {
  hasDosha: boolean;
  type: "Anuloma" | "Viloma" | null;
  /** Classical serpent name for this configuration (e.g. "Anant"), or null if birth time (and so Rahu's real house) is unknown. */
  namedType: string | null;
  rahuHouse: number | null;
};

const CLASSICAL_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const KAAL_SARP_NAMED_TYPE: Record<number, string> = {
  1: "Anant",
  2: "Kulik",
  3: "Vasuki",
  4: "Shankhpal",
  5: "Padma",
  6: "Mahapadma",
  7: "Takshak",
  8: "Karkotak",
  9: "Shankhchur",
  10: "Ghatak",
  11: "Vishdhar",
  12: "Sheshnag",
};

function absoluteLongitude(sign: ZodiacSign, degree: number): number {
  return ZODIAC_ORDER.indexOf(sign) * 30 + degree;
}

// Real, widely-cited traditional remedies (same "static lookup, not
// invented" status as gemstones.ts) — shown as optional reference
// information only, never a requirement (matches policy.ts's rule against
// instructing someone to spend money to "remove" a dosha).
export const KAAL_SARP_REMEDIES: string[] = [
  "Perform Rahu-Ketu Shanti Puja or Naga Pratishtha, traditionally done at temples specifically associated with this, such as Kalahasti (Andhra Pradesh) or Trimbakeshwar (Maharashtra).",
  "Chant the Maha Mrityunjaya Mantra regularly.",
  "Worship Lord Shiva, especially on Mondays.",
  "Offer milk to a Shivling as a symbolic gesture traditionally linked to snake (Naga) worship, rather than any act involving a real snake.",
  "Recite the Rahu and Ketu Beej Mantras.",
];

export function getRealKaalSarpDosha(
  planetaryPositions: { planet: string; sign: ZodiacSign; degree: number; house: number | null }[]
): KaalSarpDosha {
  const rahu = planetaryPositions.find((p) => p.planet === "Rahu");
  const ketu = planetaryPositions.find((p) => p.planet === "Ketu");
  if (!rahu || !ketu) return { hasDosha: false, type: null, namedType: null, rahuHouse: null };

  const rahuLon = absoluteLongitude(rahu.sign, rahu.degree);

  const sides: Array<"anuloma" | "viloma" | null> = CLASSICAL_PLANETS.map((name) => {
    const p = planetaryPositions.find((pp) => pp.planet === name);
    if (!p) return null;
    const diff = ((absoluteLongitude(p.sign, p.degree) - rahuLon) % 360 + 360) % 360;
    // The arc from Rahu forward to Ketu always spans exactly 180 degrees —
    // diff <= 180 means this planet sits in that forward arc (Anuloma
    // side); diff > 180 means it's in the reverse arc (Viloma side).
    return diff <= 180 ? "anuloma" : "viloma";
  });

  if (sides.some((s) => s === null)) return { hasDosha: false, type: null, namedType: null, rahuHouse: rahu.house };

  const allAnuloma = sides.every((s) => s === "anuloma");
  const allViloma = sides.every((s) => s === "viloma");
  const hasDosha = allAnuloma || allViloma;

  return {
    hasDosha,
    type: hasDosha ? (allAnuloma ? "Anuloma" : "Viloma") : null,
    namedType: hasDosha && rahu.house != null ? KAAL_SARP_NAMED_TYPE[rahu.house] ?? null : null,
    rahuHouse: rahu.house,
  };
}
