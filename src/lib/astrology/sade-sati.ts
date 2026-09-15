import type { ZodiacSign } from "@prisma/client";
import { houseFromSign, getTransitPlanetPositions } from "./adapter";

/**
 * Sade Sati (Saturn's 7.5-year transit cycle relative to natal Moon) —
 * computed here, not fetched: no dedicated Prokerala endpoint exists for
 * this (checked live alongside Kaal Sarp Dosha, same 404 pattern), but the
 * classical determination is fully computable from data this app already
 * fetches for daily horoscopes: getTransitPlanetPositions (adapter.ts,
 * already used by horoscope-automation.ts) gives Saturn's REAL current
 * transiting sign, and houseFromSign (also already in adapter.ts) gives
 * its whole-sign house relative to any reference sign — here, the
 * person's real natal Moon sign.
 *
 * Classical rule: Sade Sati is active when transiting Saturn is in the
 * 12th, 1st (same sign), or 2nd house from natal Moon — the three ~2.5-
 * year phases (rising/peak/setting) of the full ~7.5-year cycle.
 *
 * Saturn's sign-level position doesn't actually depend on the observer's
 * location (unlike house/ascendant, which does) — the birth profile's own
 * coordinates are still passed through only because the underlying
 * Prokerala endpoint requires some coordinates as a parameter, same
 * reasoning as horoscope-automation.ts's daily per-sign transit lookup.
 */
export type SadeSatiPhase = "rising" | "peak" | "setting";
export type SadeSatiStatus = {
  isActive: boolean;
  phase: SadeSatiPhase | null;
  saturnTransitSign: ZodiacSign | null;
  moonSign: ZodiacSign;
  isDemoData: boolean;
};

const PHASE_BY_HOUSE_FROM_MOON: Record<number, SadeSatiPhase> = { 12: "rising", 1: "peak", 2: "setting" };

// Real, widely-cited traditional remedies (same "static lookup, not
// invented" status as gemstones.ts/kaal-sarp.ts) — shown as optional
// reference information only, never a requirement.
export const SADE_SATI_REMEDIES: string[] = [
  "Worship Lord Shani (Saturn) and recite the Shani Chalisa, especially on Saturdays.",
  "Worship Lord Hanuman, traditionally considered protective during Sade Sati.",
  "Donate black sesame seeds, mustard oil, iron, or black clothing on Saturdays.",
  "Feed crows and the needy on Saturdays.",
  "A gemstone such as Blue Sapphire is sometimes suggested only after proper consultation with a qualified astrologer — never without expert guidance, given real risk of adverse effects from an ill-fitting stone.",
];

export async function getRealSadeSatiStatus(moonSign: ZodiacSign, latitude: number, longitude: number): Promise<SadeSatiStatus> {
  const transit = await getTransitPlanetPositions(new Date().toISOString(), latitude, longitude);
  const saturn = transit.positions?.find((p) => p.planet === "Saturn");
  if (!saturn) return { isActive: false, phase: null, saturnTransitSign: null, moonSign, isDemoData: transit.isDemoData };

  const houseFromMoon = houseFromSign(moonSign, saturn.sign);
  const phase = PHASE_BY_HOUSE_FROM_MOON[houseFromMoon] ?? null;

  return { isActive: phase !== null, phase, saturnTransitSign: saturn.sign, moonSign, isDemoData: transit.isDemoData };
}
