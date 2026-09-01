import type { ZodiacSign } from "@prisma/client";

/**
 * Astrology calculation adapter. This layer is deliberately kept separate
 * from the AI layer: the LLM must never be asked to invent exact planetary
 * positions. Swap ASTROLOGY_PROVIDER to plug in a real ephemeris/astrology
 * calculation API (e.g. ProKerala, AstrologyAPI, FreeAstrologyAPI, or a
 * self-hosted Swiss Ephemeris service) — implement `RealAstrologyProvider`
 * below and register it in `getAstrologyProvider()`.
 */

export type BirthInput = {
  birthDate: Date;
  birthTimeKnown: boolean;
  birthTime: string | null; // "HH:mm"
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

export type PlanetPosition = {
  planet: string;
  sign: ZodiacSign;
  degree: number;
  house: number | null;
  retrograde: boolean;
};

export type KundliResult = {
  provider: string;
  isDemoData: boolean;
  sunSign: ZodiacSign | null;
  moonSign: ZodiacSign | null;
  ascendant: ZodiacSign | null;
  nakshatra: string | null;
  planetaryPositions: PlanetPosition[] | null;
  houses: Array<{ house: number; sign: ZodiacSign }> | null;
  dasha: Array<{ period: string; from: string; to: string }> | null;
  configRequired: boolean;
};

export interface AstrologyProvider {
  calculateKundli(input: BirthInput): Promise<KundliResult>;
}

const ZODIAC_ORDER: ZodiacSign[] = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

/** Deterministic, clearly-labeled demo data. Never presented as a real calculation. */
class MockAstrologyProvider implements AstrologyProvider {
  async calculateKundli(input: BirthInput): Promise<KundliResult> {
    const seed = input.birthDate.getUTCMonth() * 31 + input.birthDate.getUTCDate();
    const sunSign = ZODIAC_ORDER[seed % 12];
    const moonSign = ZODIAC_ORDER[(seed + 4) % 12];
    const ascendant = input.birthTimeKnown ? ZODIAC_ORDER[(seed + 7) % 12] : null;

    const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

    return {
      provider: "mock",
      isDemoData: true,
      sunSign,
      moonSign,
      ascendant,
      nakshatra: input.birthTimeKnown ? "Ashwini (demo)" : null,
      planetaryPositions: planetNames.map((planet, i) => ({
        planet,
        sign: ZODIAC_ORDER[(seed + i * 2) % 12],
        degree: (seed * (i + 1)) % 30,
        house: input.birthTimeKnown ? ((seed + i) % 12) + 1 : null,
        retrograde: i % 5 === 0,
      })),
      houses: input.birthTimeKnown
        ? Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: ZODIAC_ORDER[(seed + i) % 12] }))
        : null,
      dasha: input.birthTimeKnown
        ? [
            { period: "Venus Mahadasha (demo)", from: "2021-01-01", to: "2041-01-01" },
            { period: "Sun Mahadasha (demo)", from: "2041-01-01", to: "2047-01-01" },
          ]
        : null,
      configRequired: false,
    };
  }
}

/**
 * Real provider stub. Implement this once you've picked an ephemeris /
 * astrology calculation API and set ASTROLOGY_API_BASE_URL / _KEY / _SECRET.
 * Left unimplemented on purpose: shipping invented planetary positions to
 * production would violate the product's accuracy promise.
 */
class RealAstrologyProvider implements AstrologyProvider {
  async calculateKundli(input: BirthInput): Promise<KundliResult> {
    void input;
    return {
      provider: process.env.ASTROLOGY_PROVIDER ?? "custom",
      isDemoData: false,
      sunSign: null,
      moonSign: null,
      ascendant: null,
      nakshatra: null,
      planetaryPositions: null,
      houses: null,
      dasha: null,
      configRequired: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Prokerala — https://api.prokerala.com (OAuth2 client-credentials, Lahiri
// ayanamsa Vedic calculations). Forever-free tier: 5,000 credits, no card.
// ---------------------------------------------------------------------------
let prokeralaToken: { value: string; expiresAt: number } | null = null;

/** Exported for reuse by other Prokerala-backed features (e.g. panchang.ts) — same app, same OAuth client. */
export async function getProkeralaToken(): Promise<string> {
  if (prokeralaToken && prokeralaToken.expiresAt > Date.now() + 30_000) {
    return prokeralaToken.value;
  }

  const clientId = process.env.PROKERALA_CLIENT_ID;
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PROKERALA_CLIENT_ID / PROKERALA_CLIENT_SECRET is not configured");
  }

  const res = await fetch("https://api.prokerala.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Prokerala token error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  prokeralaToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return prokeralaToken.value;
}

/**
 * Prokerala's rasi.name comes back in Sanskrit ("Dhanu", "Vrishabha" — the
 * `la=en` query param does NOT translate this field, verified against a live
 * response), so name-matching against the English ZodiacSign enum silently
 * failed. rasi.id is the reliable, language-independent field: 0=Mesha
 * (aries) through 11=Meena (pisces), directly indexing ZODIAC_ORDER — also
 * verified live (id 8 "Dhanu" = ZODIAC_ORDER[8] = "sagittarius", etc).
 */
function rasiIdToZodiacSign(id?: number | null): ZodiacSign | null {
  if (id == null || id < 0 || id > 11) return null;
  return ZODIAC_ORDER[id];
}

/** Builds an ISO8601 datetime with the birth place's UTC offset, e.g. "1996-08-19T20:00:00+05:30". */
function buildBirthDateTime(input: BirthInput): string {
  const y = input.birthDate.getUTCFullYear();
  const mo = input.birthDate.getUTCMonth();
  const d = input.birthDate.getUTCDate();
  const [hh, mm] = (input.birthTime ?? "12:00").split(":").map((n) => Number(n) || 0);
  const timeZone = input.timezone || "UTC";

  // Resolve the zone's UTC offset near this instant. Fine for non-DST zones
  // (incl. all of India); a DST zone right at its transition could be off by
  // an hour — acceptable for astrology-grade precision, not for a court date.
  const approx = new Date(Date.UTC(y, mo, d, hh, mm));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(approx);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00${offset || "+00:00"}`;
}

class ProkeralaAstrologyProvider implements AstrologyProvider {
  async calculateKundli(input: BirthInput): Promise<KundliResult> {
    if (input.latitude == null || input.longitude == null) {
      // Can't calculate without a birth place — surface as "needs setup",
      // same signal the UI already uses for a missing provider key.
      return {
        provider: "prokerala",
        isDemoData: false,
        sunSign: null,
        moonSign: null,
        ascendant: null,
        nakshatra: null,
        planetaryPositions: null,
        houses: null,
        dasha: null,
        configRequired: true,
      };
    }

    const token = await getProkeralaToken();
    const datetime = buildBirthDateTime(input);
    const coordinates = `${input.latitude},${input.longitude}`;
    const qs = new URLSearchParams({ ayanamsa: "1", coordinates, datetime, la: "en" }).toString();
    const authHeaders = { Authorization: `Bearer ${token}` };

    const [kundliRes, planetRes] = await Promise.all([
      fetch(`https://api.prokerala.com/v2/astrology/kundli?${qs}`, { headers: authHeaders }),
      fetch(`https://api.prokerala.com/v2/astrology/planet-position?${qs}`, { headers: authHeaders }),
    ]);

    if (!kundliRes.ok) {
      const body = await kundliRes.text().catch(() => "");
      throw new Error(`Prokerala kundli API error ${kundliRes.status}: ${body.slice(0, 300)}`);
    }
    if (!planetRes.ok) {
      const body = await planetRes.text().catch(() => "");
      throw new Error(`Prokerala planet-position API error ${planetRes.status}: ${body.slice(0, 300)}`);
    }

    const kundliData = await kundliRes.json();
    const planetData = await planetRes.json();

    const nakshatraDetails = kundliData?.data?.nakshatra_details;
    const sunSign = rasiIdToZodiacSign(nakshatraDetails?.soorya_rasi?.id);
    const moonSign = rasiIdToZodiacSign(nakshatraDetails?.chandra_rasi?.id);
    const nakshatra: string | null = nakshatraDetails?.nakshatra?.name ?? null;

    type ApiPlanet = {
      name: string;
      rasi?: { id?: number };
      degree?: number;
      // NOTE: despite the name, this is the planet's rashi number (rasi.id + 1,
      // 1=Aries..12=Pisces) — NOT the house number. Verified live: every
      // planet's `position` equalled its own rasi.id + 1 regardless of
      // ascendant. Real house is computed below from rasi.id relative to the
      // ascendant's rasi.id (whole-sign houses).
      position?: number;
      is_retrograde?: boolean;
    };
    const planets: ApiPlanet[] = planetData?.data?.planet_position ?? [];

    const ascendantRasiId = planets.find((p) => p.name?.toLowerCase() === "ascendant")?.rasi?.id;
    const ascendant = input.birthTimeKnown ? rasiIdToZodiacSign(ascendantRasiId) : null;

    const houseOf = (rasiId?: number): number | null =>
      input.birthTimeKnown && ascendantRasiId != null && rasiId != null
        ? ((rasiId - ascendantRasiId + 12) % 12) + 1
        : null;

    const planetaryPositions = planets.length
      ? planets
          .filter((p) => p.name && p.name.toLowerCase() !== "ascendant")
          .map((p) => ({
            planet: p.name,
            sign: rasiIdToZodiacSign(p.rasi?.id) ?? ZODIAC_ORDER[0],
            degree: typeof p.degree === "number" ? p.degree : 0,
            house: houseOf(p.rasi?.id),
            retrograde: Boolean(p.is_retrograde),
          }))
      : null;

    // Whole-sign (rashi) houses: house N's sign = ascendant sign + (N-1) signs.
    const ascendantIndex = ascendant ? ZODIAC_ORDER.indexOf(ascendant) : -1;
    const houses =
      input.birthTimeKnown && ascendantIndex >= 0
        ? Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: ZODIAC_ORDER[(ascendantIndex + i) % 12] }))
        : null;

    let dasha: KundliResult["dasha"] = null;
    if (input.birthTimeKnown) {
      const dashaRes = await fetch(`https://api.prokerala.com/v2/astrology/dasha-periods?${qs}`, {
        headers: authHeaders,
      });
      if (dashaRes.ok) {
        const dashaData = await dashaRes.json();
        type ApiDasha = { name: string; start: string; end: string };
        const periods: ApiDasha[] = dashaData?.data?.dasha_periods ?? [];
        dasha = periods.slice(0, 2).map((p) => ({ period: `${p.name} Mahadasha`, from: p.start, to: p.end }));
      }
      // Dasha is a nice-to-have on top of the chart itself — a failed/odd
      // response here degrades to "no dasha shown" rather than failing the
      // whole kundli calculation.
    }

    return {
      provider: "prokerala",
      isDemoData: false,
      sunSign,
      moonSign,
      ascendant,
      nakshatra,
      planetaryPositions,
      houses,
      dasha,
      configRequired: false,
    };
  }
}

export function getAstrologyProvider(): AstrologyProvider {
  const provider = process.env.ASTROLOGY_PROVIDER ?? "mock";
  if (provider === "mock") return new MockAstrologyProvider();
  if (provider === "prokerala") return new ProkeralaAstrologyProvider();
  return new RealAstrologyProvider();
}

// ---------------------------------------------------------------------------
// Transit positions — where the planets ACTUALLY are right now (or on a given
// date), independent of anyone's birth chart. Used by horoscope-automation.ts
// to ground daily/weekly/monthly horoscope generation in a real, per-day-
// changing signal instead of asking the AI "write today's horoscope for
// Aries" with nothing that actually differs from yesterday's prompt (found
// live: the wording changed, the substance didn't). Deliberately a separate
// function from calculateKundli — that one is birth-chart-shaped (needs an
// ascendant to compute houses); this is "which rashi is each planet
// transiting today", the same real data a physical panchang/calendar prints.
// ---------------------------------------------------------------------------

export type TransitPosition = { planet: string; sign: ZodiacSign; retrograde: boolean };
export type TransitResult = { provider: string; isDemoData: boolean; positions: TransitPosition[] | null };

const TRANSIT_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

/** Deterministic, clearly-labeled demo data — same spirit as MockAstrologyProvider. */
function getMockTransitPositions(datetime: string): TransitResult {
  const seed = new Date(datetime).getUTCDate();
  return {
    provider: "mock",
    isDemoData: true,
    positions: TRANSIT_PLANETS.map((planet, i) => ({
      planet,
      sign: ZODIAC_ORDER[(seed + i * 2) % 12],
      retrograde: i % 5 === 0,
    })),
  };
}

async function getProkeralaTransitPositions(datetime: string, latitude: number, longitude: number): Promise<TransitResult> {
  const token = await getProkeralaToken();
  const coordinates = `${latitude},${longitude}`;
  const qs = new URLSearchParams({ ayanamsa: "1", coordinates, datetime, la: "en" }).toString();
  const res = await fetch(`https://api.prokerala.com/v2/astrology/planet-position?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Prokerala planet-position API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  type ApiPlanet = { name: string; rasi?: { id?: number }; is_retrograde?: boolean };
  const planets: ApiPlanet[] = data?.data?.planet_position ?? [];

  const positions: TransitPosition[] = planets
    .filter((p) => p.name && p.name.toLowerCase() !== "ascendant")
    .map((p) => ({
      planet: p.name,
      sign: rasiIdToZodiacSign(p.rasi?.id) ?? ZODIAC_ORDER[0],
      retrograde: Boolean(p.is_retrograde),
    }));

  return { provider: "prokerala", isDemoData: false, positions: positions.length ? positions : null };
}

/** Real planetary transit positions for a given instant+place — NOT birth-chart specific. */
export async function getTransitPlanetPositions(datetime: string, latitude: number, longitude: number): Promise<TransitResult> {
  const provider = process.env.ASTROLOGY_PROVIDER ?? "mock";
  if (provider === "prokerala") return getProkeralaTransitPositions(datetime, latitude, longitude);
  return getMockTransitPositions(datetime);
}

/** Whole-sign house of `transitingSign` as seen from `referenceSign` (e.g. a reader's Moon sign) — house 1 = same sign, house 2 = next sign, etc. Same math as the birth-chart ascendant-relative houses above, just with a zodiac sign as the reference point instead of a calculated ascendant. */
export function houseFromSign(referenceSign: ZodiacSign, transitingSign: ZodiacSign): number {
  const refIndex = ZODIAC_ORDER.indexOf(referenceSign);
  const transitIndex = ZODIAC_ORDER.indexOf(transitingSign);
  return ((transitIndex - refIndex + 12) % 12) + 1;
}

/** 0-100 completeness score used to drive the "data completeness" UI. */
export function birthDataCompleteness(input: Partial<BirthInput> & { birthCity?: string | null }) {
  let score = 0;
  if (input.birthDate) score += 40;
  if (input.birthTimeKnown && input.birthTime) score += 30;
  if (input.birthCity) score += 20;
  if (input.timezone) score += 10;
  return score;
}

// ---------------------------------------------------------------------------
// AI grounding — lets chat/compatibility answer from the user's REAL
// calculated chart instead of the model guessing generically from just a
// birth date. Previously `generateAstrologyReply` only ever got free-text
// birth details (date/time/city) as context; the model never saw the actual
// sun/moon/ascendant/nakshatra/planetary-house data this app already
// calculates. This is the fix — still "never invent" (per the rule at the
// top of this file): only genuinely calculated data is summarized, and
// mock/demo data is labeled as such rather than presented as real.
// ---------------------------------------------------------------------------
import { prisma } from "@/lib/prisma";

/** Reuses a birth profile's cached KundliCalculation if one exists, else computes and caches one — same logic /api/kundli uses, extracted so chat can share it instead of always showing "not configured". */
export async function getOrComputeKundliCalculation(profile: {
  id: string;
  birthDate: Date;
  birthTimeKnown: boolean;
  birthTime: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}) {
  const existing = await prisma.kundliCalculation.findFirst({
    where: { birthProfileId: profile.id },
    orderBy: { calculatedAt: "desc" },
  });
  if (existing) return existing;

  const result = await getAstrologyProvider().calculateKundli({
    birthDate: profile.birthDate,
    birthTimeKnown: profile.birthTimeKnown,
    birthTime: profile.birthTime,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
  });

  // Don't permanently cache a calculation that couldn't actually be done
  // (configRequired, or no sunSign) — e.g. a birth profile whose city
  // geocoding silently failed during onboarding and has no lat/lng yet.
  // Persisting it as a normal cache row would mean this profile can NEVER
  // get a real chart even after the missing data is fixed later, because
  // the `existing` lookup above would keep finding this empty row forever.
  // Found live: a seeded profile with no coordinates had exactly this — a
  // cached row full of nulls, silently blocking chat grounding for good.
  if (result.configRequired || !result.sunSign) {
    return {
      id: `uncached-${profile.id}`,
      birthProfileId: profile.id,
      provider: result.provider,
      isDemoData: result.isDemoData,
      sunSign: result.sunSign,
      moonSign: result.moonSign,
      ascendant: result.ascendant,
      nakshatra: result.nakshatra,
      planetaryPositions: result.planetaryPositions,
      houses: result.houses,
      dasha: result.dasha,
      explanation: null,
      explanationLocale: null,
      calculatedAt: new Date(),
    };
  }

  return prisma.kundliCalculation.create({
    data: {
      birthProfileId: profile.id,
      provider: result.provider,
      isDemoData: result.isDemoData,
      sunSign: result.sunSign,
      moonSign: result.moonSign,
      ascendant: result.ascendant,
      nakshatra: result.nakshatra,
      planetaryPositions: result.planetaryPositions ?? undefined,
      houses: result.houses ?? undefined,
      dasha: result.dasha ?? undefined,
    },
  });
}

/** Compact, AI-prompt-ready summary of a calculated chart. Returns undefined when there's nothing real to summarize (no provider configured, or the calc never resolved) — the caller then just falls back to whatever birth-detail text context it already had. Accepts either a live KundliResult or a persisted KundliCalculation row (their relevant fields line up). */
export function summarizeKundliForAi(calc: {
  isDemoData: boolean;
  sunSign: string | null;
  moonSign: string | null;
  ascendant: string | null;
  nakshatra: string | null;
  planetaryPositions: unknown;
} | null | undefined): string | undefined {
  if (!calc || !calc.sunSign) return undefined;

  const label = calc.isDemoData
    ? "Demo/placeholder chart data (NOT a real calculation — clearly say so if asked)"
    : "Real calculated Vedic birth chart (Lahiri ayanamsa)";
  const parts = [
    `${label}: Sun sign ${calc.sunSign}, Moon sign ${calc.moonSign ?? "unknown"}, Ascendant ${calc.ascendant ?? "unknown"}, Nakshatra ${calc.nakshatra ?? "unknown"}.`,
  ];

  const positions = calc.planetaryPositions as
    | Array<{ planet: string; sign: string; house: number | null; retrograde: boolean }>
    | null
    | undefined;
  if (Array.isArray(positions) && positions.length) {
    const planetStr = positions
      .map((p) => `${p.planet} in ${p.sign}${p.house ? ` (house ${p.house})` : ""}${p.retrograde ? " retrograde" : ""}`)
      .join(", ");
    parts.push(`Planetary positions: ${planetStr}.`);
  }

  return parts.join(" ");
}
