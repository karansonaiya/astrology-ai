import { prisma } from "@/lib/prisma";
import { generateHoroscopeDraft, type DayAstroContext } from "@/lib/ai/horoscope-content";
import { ZODIAC_SIGNS, type ZodiacSign } from "@/lib/zodiac";
import type { AppLocale } from "@/lib/i18n/config";
import { geocodeBirthPlace } from "@/lib/geo";
import { getCachedPanchang, buildLocalMorningDateTime } from "@/lib/astrology/panchang";
import { getTransitPlanetPositions, houseFromSign } from "@/lib/astrology/adapter";

// Found live (2026-09-15): a burst of 4 simultaneous requests against the
// SAME free-tier Gemini model reliably trips its per-MINUTE rate limit
// (its per-DAY quota, 500 RPD, is nowhere near exhausted — the account is
// staying on the free tier, not upgrading, see .env's GEMINI_MODEL
// comment). Every rate-limited call then falls through provider.ts's
// entire fallback chain (6+ other models, each a real network round-trip),
// which both slows this request down a lot AND burns into THOSE models'
// separate free quotas — quotas real user-facing features (chat, career,
// etc.) rely on all day.
//
// The tempting fix — add a real delay between calls so the request rate
// respects the per-minute cap — does NOT work here: Netlify's free/
// personal-plan function timeout is a hard 10 SECONDS per invocation
// (confirmed against Netlify's own docs/support forum, 2026-09-15), and a
// safe per-minute pace for 12 signs needs 30-90+ seconds, not 10. That
// ceiling is exactly why generate-horoscopes/route.ts already splits the
// cron into one request per locale rather than one for everything — and
// now also splits further, one request per (locale, sign) pair (see that
// route's `sign` query param), each fast enough alone to fit the 10s wall.
// daily-cron.yml is what actually spaces those 36 separate requests out
// over real time — that pacing has to live OUTSIDE any single Netlify
// function's execution window, in the caller driving it.
//
// Concurrency here is just a modest safety margin for whoever still calls
// this with multiple signs in one request (the admin "Generate with AI"
// button, or a local/manual full run) — it doesn't need to be paranoid
// about rate limits the way the automated daily cron does, since a manual
// click is rare and tolerates an occasional slow fallback-chain hit.
const CONCURRENCY = 2;

// Same reference city as /api/cron/prefill-panchang — deliberately the same
// lat/lon so this hits that cron's already-warmed PanchangCache instead of
// spending a fresh Prokerala call every generation run. Real per-day
// astrology (which nakshatra/tithi the Moon is actually in) is what makes
// "today's horoscope" genuinely different from yesterday's instead of the AI
// just rephrasing the same generic "be honest, take initiative" advice with
// no real day-specific signal to react to (found live: the wording changed
// day to day but the substance didn't, because the prompt gave it nothing
// that actually changes day to day).
const REFERENCE_CITY = "Ahmedabad";
const REFERENCE_COUNTRY = "India";

type SharedDayData = {
  dateStr: string;
  vaara: string | null;
  nakshatra: string | null;
  tithi: string | null;
  yoga: string | null;
  // Real transiting planet positions for the day, sign-independent — turned
  // into a per-sign whole-sign house list by contextForSign() below. This is
  // the part that makes Aries's reading genuinely different from Taurus's on
  // the same day: same real planets, different houses per sign (see
  // houseFromSign's comment in adapter.ts).
  transitPositions: { planet: string; sign: ZodiacSign; retrograde: boolean }[] | null;
};

/** One shared fetch per generation batch (not per-sign) — the day's real transit doesn't depend on which zodiac sign is being written about. */
async function getSharedDayData(periodDate: Date): Promise<SharedDayData | null> {
  try {
    const geo = await geocodeBirthPlace(REFERENCE_CITY, REFERENCE_COUNTRY);
    if (!geo) return null;
    const dateStr = periodDate.toISOString().slice(0, 10);
    const datetime = buildLocalMorningDateTime(dateStr, geo.timezone);
    const [panchang, transit] = await Promise.all([
      getCachedPanchang({ latitude: geo.latitude, longitude: geo.longitude, datetime }),
      getTransitPlanetPositions(datetime, geo.latitude, geo.longitude),
    ]);
    return {
      dateStr,
      vaara: panchang.vaara,
      nakshatra: panchang.nakshatra[0]?.name ?? null,
      tithi: panchang.tithi[0]?.name ?? null,
      yoga: panchang.yoga[0]?.name ?? null,
      transitPositions: transit.positions,
    };
  } catch {
    // Real-data grounding is a quality improvement, not a hard requirement —
    // if geocoding/Prokerala is unavailable, fall back to generic generation
    // (still a valid, if blander, horoscope) rather than blocking the whole
    // batch on it.
    return null;
  }
}

function contextForSign(shared: SharedDayData | null, sign: ZodiacSign): DayAstroContext | null {
  if (!shared) return null;
  return {
    dateStr: shared.dateStr,
    vaara: shared.vaara,
    nakshatra: shared.nakshatra,
    tithi: shared.tithi,
    yoga: shared.yoga,
    transitHouses: shared.transitPositions
      ? shared.transitPositions.map((p) => ({ planet: p.planet, house: houseFromSign(sign, p.sign), retrograde: p.retrograde }))
      : null,
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type GenerateHoroscopesParams = {
  period: "daily" | "weekly" | "monthly";
  locale: AppLocale;
  periodDate: Date;
  signs?: ZodiacSign[]; // defaults to all 12
  /** true for the unattended cron path (see /api/cron/generate-horoscopes) —
   * publishes immediately, no human review. false for the admin "Generate
   * with AI" button, which always lands as a draft (see CLAUDE.md: AI
   * content shown publicly is never auto-published without this explicit,
   * deliberate opt-in). */
  autoPublish: boolean;
  createdBy?: string;
};

export type GenerateHoroscopesResult = {
  created: ZodiacSign[];
  skipped: ZodiacSign[];
  failed: { sign: ZodiacSign; error: string }[];
};

/** Shared by the admin manual-generate route and the cron auto-publish route — see each for how `autoPublish` differs. */
export async function generateHoroscopesForDate(params: GenerateHoroscopesParams): Promise<GenerateHoroscopesResult> {
  const { period, locale, periodDate, autoPublish, createdBy } = params;
  const signs = params.signs ?? [...ZODIAC_SIGNS];

  const existing = await prisma.horoscopeContent.findMany({
    where: { period, locale, periodDate, zodiacSign: { in: signs } },
    select: { zodiacSign: true },
  });
  const alreadyHave = new Set(existing.map((e) => e.zodiacSign));
  const toGenerate = signs.filter((s) => !alreadyHave.has(s));

  const sharedDayData = toGenerate.length > 0 ? await getSharedDayData(periodDate) : null;

  const outcomes = await mapWithConcurrency(toGenerate, CONCURRENCY, async (sign) => {
    try {
      const dayContext = contextForSign(sharedDayData, sign);
      const fields = await generateHoroscopeDraft(sign, period, locale, dayContext);
      await prisma.horoscopeContent.create({
        data: {
          zodiacSign: sign,
          period,
          locale,
          periodDate,
          ...fields,
          status: autoPublish ? "published" : "draft",
          publishedAt: autoPublish ? new Date() : undefined,
          createdBy,
        },
      });
      return { sign, ok: true as const };
    } catch (err) {
      return { sign, ok: false as const, error: err instanceof Error ? err.message : "unknown error" };
    }
  });

  return {
    created: outcomes.filter((o) => o.ok).map((o) => o.sign),
    skipped: signs.filter((s) => alreadyHave.has(s)),
    failed: outcomes.filter((o): o is { sign: ZodiacSign; ok: false; error: string } => !o.ok).map((o) => ({ sign: o.sign, error: o.error })),
  };
}
