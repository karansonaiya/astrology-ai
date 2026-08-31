import { NextRequest, NextResponse } from "next/server";
import { geocodeBirthPlace } from "@/lib/geo";
import { getCachedPanchang, isPanchangCached, buildLocalMorningDateTime } from "@/lib/astrology/panchang";

/**
 * Warms the panchang cache ahead of time for the /panchang page's default
 * city, so the month view is instant for the common case (default city,
 * current month) — see the DB-cache comment in panchang.ts for why this
 * exists: Prokerala's 5-req/60s account-wide rate limit makes computing 30
 * days live, on one request, take several minutes.
 *
 * Only *live-fetched* days count against that rate limit — already-cached
 * days (from a previous run, or from real visitor traffic) cost nothing and
 * aren't paced. Safe to re-run any time (idempotent, skips what's cached).
 *
 * Trigger daily via Vercel Cron (see vercel.json) or any external
 * scheduler, same auth as /api/cron/generate-horoscopes:
 * `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`.
 *
 * Pacing: each day's panchang costs FOUR Prokerala requests, not one (see
 * panchang.ts) — so only one day is live-fetched per 65s, not a batch.
 * 30 days cold therefore takes ~30 minutes; a single run rarely gets that
 * far before its own time limit, which is fine — each subsequent day's cron
 * run finds most of the window already cached and just pushes the frontier
 * forward by however far this run got. Full 30-day coverage settles in
 * within a few days of normal daily runs, not necessarily the first one.
 */
export const maxDuration = 300; // confirm your Vercel plan allows a cron function this long; a lower value just means slower cold-cache warmup, not a failure — see the pacing note above.

const DEFAULT_CITY = "Ahmedabad";
const DEFAULT_COUNTRY = "India";
const PREFILL_DAYS = 30;
const PAUSE_BETWEEN_LIVE_FETCHES_MS = 65_000; // one day's panchang = 4 Prokerala requests, so pace per-day, not per-batch

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextNDatesIst(n: number): string[] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const todayUtcMidnight = Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  return Array.from({ length: n }, (_, i) => new Date(todayUtcMidnight + i * 86_400_000).toISOString().slice(0, 10));
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const geo = await geocodeBirthPlace(DEFAULT_CITY, DEFAULT_COUNTRY);
  if (!geo) return NextResponse.json({ error: "default_city_geocode_failed" }, { status: 500 });

  const dates = nextNDatesIst(PREFILL_DAYS);
  let alreadyCached = 0;
  let filled = 0;
  const failed: string[] = [];
  let isFirstLiveFetch = true;

  for (const date of dates) {
    if (await isPanchangCached(geo.latitude, geo.longitude, date)) {
      alreadyCached++;
      continue;
    }

    // Pause before every live fetch after the first — each one is 4
    // Prokerala requests on its own (see panchang.ts), so there's no room
    // to batch more than one per 60s window.
    if (!isFirstLiveFetch) await sleep(PAUSE_BETWEEN_LIVE_FETCHES_MS);
    isFirstLiveFetch = false;

    try {
      const datetime = buildLocalMorningDateTime(date, geo.timezone);
      await getCachedPanchang({ latitude: geo.latitude, longitude: geo.longitude, datetime });
      filled++;
    } catch {
      failed.push(date);
    }
  }

  return NextResponse.json({ city: DEFAULT_CITY, daysRequested: dates.length, alreadyCached, filled, failed });
}
