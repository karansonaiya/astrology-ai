import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geo";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Public (used from onboarding, before login exists yet) — powers the
// birth-city autocomplete. Rate-limited generously since a real typing
// session fires several requests (client debounces to ~1 per 350ms), but
// still bounded to protect Nominatim's usage policy from abuse.
const SEARCH_MAX = 60;
const SEARCH_WINDOW_SECONDS = 60 * 60;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit("geo-search", ip, SEARCH_MAX, SEARCH_WINDOW_SECONDS);
  if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await searchPlaces(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }); // best-effort — a geocoder hiccup shouldn't break the form
  }
}
