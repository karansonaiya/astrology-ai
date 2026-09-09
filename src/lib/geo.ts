import tzLookup from "tz-lookup";
import { prisma } from "@/lib/prisma";

/**
 * Turns a free-text birth city/country into coordinates + IANA timezone, so
 * the astrology provider (which needs lat/long, not a place name) has what
 * it needs. Nothing in the onboarding/profile forms collects lat/long
 * directly — this is the only place they get filled in.
 *
 * Geocoding: OpenStreetMap Nominatim — free, no API key/signup. Its usage
 * policy caps this at ~1 request/second and requires an identifying
 * User-Agent (both satisfied below); it's fine for this app's volume, but a
 * high-traffic production deployment should move to a paid geocoder (Google,
 * LocationIQ, Mapbox) or self-host Nominatim. See
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * Timezone: resolved offline from the coordinates via `tz-lookup` — no
 * second network call, and no birth-place data leaves the server twice.
 *
 * Cached (GeocodeCache, no expiry) by the exact normalized query string —
 * found live, this had zero caching before, so the same common city
 * (Ahmedabad, Surat, Mumbai...) typed by many different users re-hit
 * Nominatim every single time. A city's coordinates never change, and
 * skipping the repeat call isn't just faster — it's what keeps this app
 * within Nominatim's ~1 req/s policy as real traffic grows, instead of
 * risking an IP ban that would break onboarding for everyone.
 */
export type GeocodeResult = { latitude: number; longitude: number; timezone: string };

function normalizeQuery(city: string, country?: string | null): string {
  return [city, country].filter(Boolean).join(", ").trim().toLowerCase();
}

export async function geocodeBirthPlace(city: string, country?: string | null): Promise<GeocodeResult | null> {
  const query = [city, country].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  const cacheKey = normalizeQuery(city, country);
  const cached = await prisma.geocodeCache.findUnique({ where: { query: cacheKey } }).catch(() => null);
  if (cached) return { latitude: cached.latitude, longitude: cached.longitude, timezone: cached.timezone };

  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
  })}`;

  const res = await fetch(url, {
    headers: {
      // Nominatim requires a real identifying User-Agent per its usage policy.
      "User-Agent": "PrernaAI/1.0 (astrology birth-chart lookup)",
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  const first = results[0];
  if (!first) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const timezone = resolveTimezone(latitude, longitude);
  if (!timezone) return null;

  await prisma.geocodeCache
    .upsert({ where: { query: cacheKey }, create: { query: cacheKey, latitude, longitude, timezone }, update: { latitude, longitude, timezone } })
    .catch(() => {
      // best-effort cache write — a failed write shouldn't fail the actual geocode the user is waiting on
    });

  return { latitude, longitude, timezone };
}

/** Offline timezone lookup from coordinates — no network call. Returns null for coordinates with no timezone (open ocean). */
export function resolveTimezone(latitude: number, longitude: number): string | null {
  try {
    return tzLookup(latitude, longitude);
  } catch {
    return null;
  }
}

export type PlaceSuggestion = {
  label: string; // e.g. "Surat, Gujarat, India" — what to show/store as the free-text city
  city: string;
  state: string | null;
  country: string;
  countryCode: string | null; // ISO 3166-1 alpha-2, for a flag icon client-side
  latitude: number;
  longitude: number;
};

type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

// Small in-memory layer on top of PlaceSearchCache purely to skip a DB
// round-trip for a repeat keystroke within the same request burst (same
// spirit as panchang.ts's in-memory layer over PanchangCache) — the DB
// table is what actually makes this shared across users and serverless
// instances, which a plain Map on its own never was.
const searchCache = new Map<string, { value: PlaceSuggestion[]; expiresAt: number }>();
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Live city-search-as-you-type for the birth-city autocomplete (see
 * CityAutocomplete component) — lets someone pick an exact place from a
 * real list instead of free-typing something that might geocode to the
 * wrong "Surat" (there's one in Thailand too). Returns up to 8 matches,
 * worldwide (not restricted to India — diaspora users may have been born
 * elsewhere), cached per query string since autocomplete tends to repeat
 * common queries across many users.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const memHit = searchCache.get(cacheKey);
  if (memHit && memHit.expiresAt > Date.now()) return memHit.value;

  const dbHit = await prisma.placeSearchCache.findUnique({ where: { query: cacheKey } }).catch(() => null);
  if (dbHit) {
    const value = dbHit.results as unknown as PlaceSuggestion[];
    searchCache.set(cacheKey, { value, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
    return value;
  }

  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
  })}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "PrernaAI/1.0 (astrology birth-chart lookup)", Accept: "application/json" },
  });
  if (!res.ok) return [];

  const results = (await res.json()) as NominatimSearchResult[];
  const suggestions: PlaceSuggestion[] = results
    .map((r): PlaceSuggestion | null => {
      const latitude = Number(r.lat);
      const longitude = Number(r.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      const city = r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.hamlet ?? r.address?.county ?? r.display_name.split(",")[0];
      const state = r.address?.state ?? null;
      const country = r.address?.country ?? "";
      const label = [city, state, country].filter(Boolean).join(", ");
      return { label, city, state, country, countryCode: r.address?.country_code?.toUpperCase() ?? null, latitude, longitude };
    })
    .filter((s): s is PlaceSuggestion => s !== null);

  searchCache.set(cacheKey, { value: suggestions, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  await prisma.placeSearchCache
    .upsert({ where: { query: cacheKey }, create: { query: cacheKey, results: suggestions as object }, update: { results: suggestions as object } })
    .catch(() => {
      // best-effort cache write — a failed write shouldn't fail the actual search the user is waiting on
    });
  return suggestions;
}
