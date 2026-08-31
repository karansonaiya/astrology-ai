import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { kundliLookupSchema } from "@/lib/validations/kundli";
import { getAstrologyProvider } from "@/lib/astrology/adapter";
import { geocodeBirthPlace } from "@/lib/geo";
import { rateLimit } from "@/lib/rate-limit";

// For looking up someone else's kundli (a friend, family member) ad hoc —
// deliberately NOT persisted as a BirthProfile: this is a one-off lookup,
// not "add another person to my account". No AI/credit involved either
// (same as /api/kundli for the user's own chart) — it's a direct
// astrology-provider calculation, not an LLM call.
const LOOKUP_MAX = 15;
const LOOKUP_WINDOW_SECONDS = 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const rl = await rateLimit("kundli-lookup", user.id, LOOKUP_MAX, LOOKUP_WINDOW_SECONDS);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = kundliLookupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    const { name, birthDate, birthTimeKnown, birthTime, birthCity, birthCountry } = parsed.data;

    const geo = await geocodeBirthPlace(birthCity, birthCountry).catch(() => null);
    if (!geo) return NextResponse.json({ error: "place_not_found" }, { status: 422 });

    const calculation = await getAstrologyProvider().calculateKundli({
      birthDate: new Date(`${birthDate}T00:00:00.000Z`),
      birthTimeKnown,
      birthTime: birthTimeKnown ? birthTime ?? null : null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
    });

    return NextResponse.json({ name: name ?? null, calculation });
  } catch (err) {
    return errorResponse(err);
  }
}
