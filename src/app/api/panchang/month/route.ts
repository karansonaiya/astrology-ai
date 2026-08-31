import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/auth/guard";
import { panchangMonthQuerySchema } from "@/lib/validations/panchang";
import { geocodeBirthPlace } from "@/lib/geo";
import { getPanchangForDates } from "@/lib/astrology/panchang";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Lower cap than the single-day endpoint — a month view is 31x heavier on
// the (cached) backend, and each uncached day still eats into Prokerala's
// per-minute budget (see getPanchangForDates's live-fetch cap).
const LOOKUP_MAX = 10;
const LOOKUP_WINDOW_SECONDS = 60 * 60;

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await rateLimit("panchang-month", ip, LOOKUP_MAX, LOOKUP_WINDOW_SECONDS);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { searchParams } = new URL(req.url);
    const parsed = panchangMonthQuerySchema.safeParse({
      city: searchParams.get("city") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      month: searchParams.get("month") ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    const { city, country, year, month } = parsed.data;
    const geo = await geocodeBirthPlace(city, country).catch(() => null);
    if (!geo) return NextResponse.json({ error: "place_not_found" }, { status: 422 });

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      const m = String(month).padStart(2, "0");
      return `${year}-${m}-${d}`;
    });

    const days = await getPanchangForDates(geo.latitude, geo.longitude, geo.timezone, dates);

    return NextResponse.json({ city, country, year, month, days });
  } catch (err) {
    return errorResponse(err);
  }
}
