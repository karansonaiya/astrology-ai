import type { PlanetPosition } from "./adapter";

export type PlanetAspect = {
  from: string; // aspecting planet name
  toHouse: number; // house being aspected (1-12)
  toPlanets: string[]; // other planets sitting in that aspected house, if any
};

/**
 * Classical Parashari graha drishti (planetary aspect) rules — computed
 * deterministically from real house positions already on the chart, not a
 * separate Prokerala API call: they don't have a dedicated aspects/drishti
 * endpoint (confirmed live — /v2/astrology/aspects and /planet-aspects both
 * 404; their "Planet Relationship" endpoint is a different concept,
 * Naisargika/planetary-friendship, not house-aspect). This is the same
 * "compute it ourselves from real data" approach the codebase already uses
 * for houses (see adapter.ts's houseOf()) rather than trusting a field.
 *
 * Every graha aspects the 7th house from its own position (full aspect,
 * i.e. opposition). Mars, Jupiter, and Saturn each get additional special
 * full aspects beyond that — the specific, undisputed core of Parashari
 * drishti taught across classical sources. Deliberately NOT extended to
 * Rahu/Ketu's special aspects: which houses the lunar nodes additionally
 * aspect varies by tradition/text, so only their universal 7th-house
 * aspect (which every source agrees on) is included, rather than asserting
 * a contested rule as settled fact.
 */
const SPECIAL_ASPECT_OFFSETS: Record<string, number[]> = {
  mars: [3, 7], // 4th and 8th from itself, in addition to the universal 7th
  jupiter: [4, 8], // 5th and 9th
  saturn: [2, 9], // 3rd and 10th
};
const UNIVERSAL_ASPECT_OFFSET = 6; // 7th from itself, every graha

export function computeVedicAspects(positions: PlanetPosition[] | null | undefined): PlanetAspect[] | null {
  if (!positions?.length) return null;
  const withHouses = positions.filter((p) => p.house != null);
  if (!withHouses.length) return null; // no birth time -> no houses -> aspects aren't meaningful

  const housePlanets = (house: number) => positions.filter((p) => p.house === house).map((p) => p.planet);

  const results: PlanetAspect[] = [];
  for (const p of withHouses) {
    const key = p.planet.toLowerCase();
    const offsets = [UNIVERSAL_ASPECT_OFFSET, ...(SPECIAL_ASPECT_OFFSETS[key] ?? [])];
    for (const offset of offsets) {
      const toHouse = (((p.house! - 1 + offset) % 12) + 12) % 12 + 1;
      results.push({ from: p.planet, toHouse, toPlanets: housePlanets(toHouse) });
    }
  }
  return results;
}
