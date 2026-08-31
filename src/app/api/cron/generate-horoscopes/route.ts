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
 */
const LOCALES = ["en", "hi", "gu"] as const;

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

  const { dateStr, weekday, dayOfMonth } = getIstToday();
  const periodDate = new Date(`${dateStr}T00:00:00.000Z`);

  const periods: Array<"daily" | "weekly" | "monthly"> = ["daily"];
  if (weekday === "Mon") periods.push("weekly");
  if (dayOfMonth === 1) periods.push("monthly");

  const results: Record<string, Record<string, GenerateHoroscopesResult>> = {};
  for (const period of periods) {
    results[period] = {};
    for (const locale of LOCALES) {
      results[period][locale] = await generateHoroscopesForDate({ period, locale, periodDate, autoPublish: true });
    }
  }

  return NextResponse.json({ date: dateStr, periodsRun: periods, results });
}
