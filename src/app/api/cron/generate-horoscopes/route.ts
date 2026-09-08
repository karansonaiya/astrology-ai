import { NextRequest, NextResponse } from "next/server";
import { generateHoroscopesForDate, type GenerateHoroscopesResult } from "@/lib/horoscope-automation";

/**
 * Unattended daily automation — see CLAUDE.md and the admin route for why
 * this is the ONE path in the app allowed to auto-publish AI content
 * without a human review step. That's a deliberate exception the product
 * owner asked for specifically for routine daily horoscope content (low-
 * stakes, generic, already constrained by the same safety/policy prompt as
 * every other AI feature) — not a general precedent for other AI content.
 *
 * Trigger this once a day via Vercel Cron (see vercel.json) or any external
 * scheduler (cron-job.org, GitHub Actions, etc.) hitting this URL with
 * `Authorization: Bearer <CRON_SECRET>` (or `?secret=<CRON_SECRET>`).
 *
 * Idempotent — safe to trigger more than once a day; already-existing
 * period/locale/sign rows for the date are skipped, not re-created.
 *
 * Optional `?locale=en|hi|gu` scopes one call to a single locale instead of
 * all 3. Found live: a single request doing all 3 locales × up to 12 signs
 * (36 AI calls) reliably 502'd on Netlify — its function timeout kills the
 * request mid-run before all 3 locales finish. daily-cron.yml now calls
 * this once per locale (with its own retry) instead of once for everything,
 * so each individual request has a third of the work and a real chance of
 * finishing before Netlify's timeout, with the already-idempotent skip
 * logic making a retry cheap (it only redoes whatever didn't finish).
 * Omitting `locale` keeps the old all-3-locales-in-one-call behavior, still
 * useful for a local/manual full run.
 */
const LOCALES = ["en", "hi", "gu"] as const;
type Locale = (typeof LOCALES)[number];
function isLocale(v: string | null): v is Locale {
  return v != null && (LOCALES as readonly string[]).includes(v);
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const queryParam = new URL(req.url).searchParams.get("secret");
  return queryParam === secret;
}

/** "Today" in India, not the server's own timezone — a cron firing near midnight UTC shouldn't shift which IST day a weekly/monthly run lands on. */
function getIstToday() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  return { dateStr, weekday: get("weekday"), dayOfMonth: Number(get("day")) };
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const requestedLocale = new URL(req.url).searchParams.get("locale");
  if (requestedLocale != null && !isLocale(requestedLocale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  const locales: readonly Locale[] = requestedLocale ? [requestedLocale] : LOCALES;

  const { dateStr, weekday, dayOfMonth } = getIstToday();
  const periodDate = new Date(`${dateStr}T00:00:00.000Z`);

  const periods: Array<"daily" | "weekly" | "monthly"> = ["daily"];
  if (weekday === "Mon") periods.push("weekly");
  if (dayOfMonth === 1) periods.push("monthly");

  const results: Record<string, Record<string, GenerateHoroscopesResult>> = {};
  for (const period of periods) {
    results[period] = {};
    for (const locale of locales) {
      results[period][locale] = await generateHoroscopesForDate({ period, locale, periodDate, autoPublish: true });
    }
  }

  return NextResponse.json({ date: dateStr, periodsRun: periods, locales, results });
}
