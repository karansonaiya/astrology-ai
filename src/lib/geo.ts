import tzLookup from "tz-lookup";

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
 */
export type GeocodeResult = { latitude: number; longitude: number; timezone: string };

export async function geocodeBirthPlace(city: string, country?: string | null): Promise<GeocodeResult | null> {
  const query = [city, country].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
  })}`;

  const res = await fetch(url, {
    headers: {
      // Nominatim requires a real identifying User-Agent per its usage policy.
      "User-Agent": "JyotiAI/1.0 (astrology birth-chart lookup)",
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

  let timezone: string;
  try {
    timezone = tzLookup(latitude, longitude);
  } catch {
    return null; // e.g. coordinates over open ocean
  }

  return { latitude, longitude, timezone };
}
