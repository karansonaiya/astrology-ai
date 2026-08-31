import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/auth/guard";
import { panchangQuerySchema } from "@/lib/validations/panchang";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";
import { getCachedPanchang, buildLocalMorningDateTime } from "@/lib/astrology/panchang";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Public, no login — this is the SEO/utility page (see /panchang), same
// spirit as /api/horoscope. Not AI, not credit-metered: a direct
// astronomical/astrological calculation, cached per day+place (see
// getCachedPanchang). Rate-limited by IP purely to protect the Prokerala
// quota from scraping, not because the data itself is scarce.
const LOOKUP_MAX = 30;
const LOOKUP_WINDOW_SECONDS = 60 * 60;

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await rateLimit("panchang", ip, LOOKUP_MAX, LOOKUP_WINDOW_SECONDS);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { searchParams } = new URL(req.url);
    const parsed = panchangQuerySchema.safeParse({
      city: searchParams.get("city") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      latitude: searchParams.get("latitude") ?? undefined,
      longitude: searchParams.get("longitude") ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

    // Prefer exact coordinates from a CityAutocomplete selection over
    // re-geocoding the typed text (see birth-profile/route.ts for why).
    const geo =
      parsed.data.latitude != null && parsed.data.longitude != null
        ? { latitude: parsed.data.latitude, longitude: parsed.data.longitude, timezone: resolveTimezone(parsed.data.latitude, parsed.data.longitude) }
        : await geocodeBirthPlace(parsed.data.city, parsed.data.country).catch(() => null);
    if (!geo || !geo.timezone) return NextResponse.json({ error: "place_not_found" }, { status: 422 });

    const datetime = buildLocalMorningDateTime(date, geo.timezone);
    const panchang = await getCachedPanchang({ latitude: geo.latitude, longitude: geo.longitude, datetime });

    return NextResponse.json({ city: parsed.data.city, country: parsed.data.country, date, panchang });
  } catch (err) {
    return errorResponse(err);
  }
}
