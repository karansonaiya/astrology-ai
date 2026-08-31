import { getProkeralaToken } from "./adapter";

/**
 * Panchang / Choghadiya / Muhurat calculation. Separate from adapter.ts
 * (birth-chart calculation) because it's location+date based, not
 * birth-profile based — no user account needed, matching the public,
 * no-login page this powers (see /panchang). Follows the same
 * mock/real-provider pattern as the rest of the app, keyed off the same
 * ASTROLOGY_PROVIDER env var as the kundli adapter (same underlying data
 * source — Prokerala).
 */

export type TimeWindow = { start: string; end: string };
export type PanchangPeriod = { name: string; type: string; windows: TimeWindow[] };
export type ChoghadiyaSlot = { name: string; type: string; start: string; end: string };

export type PanchangResult = {
  provider: string;
  isDemoData: boolean;
  configRequired: boolean;
  vaara: string | null;
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  tithi: PanchangPeriod[];
  nakshatra: PanchangPeriod[];
  yoga: PanchangPeriod[];
  karana: PanchangPeriod[];
  choghadiyaDay: ChoghadiyaSlot[];
  choghadiyaNight: ChoghadiyaSlot[];
  auspicious: PanchangPeriod[];
  inauspicious: PanchangPeriod[];
};

export type PanchangInput = {
  latitude: number;
  longitude: number;
  /** Local wall-clock instant to compute panchang for, already resolved to the place's offset. */
  datetime: string; // ISO8601 with offset, e.g. "2026-08-27T06:00:00+05:30"
};

export interface PanchangProvider {
  getPanchang(input: PanchangInput): Promise<PanchangResult>;
}

const ZODIAC_DEMO_TITHI = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami"];

/** Deterministic, clearly-labeled demo data — same spirit as MockAstrologyProvider. */
class MockPanchangProvider implements PanchangProvider {
  async getPanchang(input: PanchangInput): Promise<PanchangResult> {
    const seed = new Date(input.datetime).getUTCDate();
    const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(input.datetime).getUTCDay()];
    const demoWindow = (h1: number, m1: number, h2: number, m2: number): TimeWindow => ({
      start: `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}`,
      end: `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`,
    });

    return {
      provider: "mock",
      isDemoData: true,
      configRequired: false,
      vaara: day,
      sunrise: "06:15",
      sunset: "18:45",
      moonrise: "19:00",
      moonset: "06:30",
      tithi: [{ name: `${ZODIAC_DEMO_TITHI[seed % 5]} (demo)`, type: "Shukla Paksha", windows: [demoWindow(0, 0, 23, 59)] }],
      nakshatra: [{ name: "Ashwini (demo)", type: "", windows: [demoWindow(0, 0, 23, 59)] }],
      yoga: [{ name: "Vishkambha (demo)", type: "", windows: [demoWindow(0, 0, 23, 59)] }],
      karana: [{ name: "Bava (demo)", type: "", windows: [demoWindow(0, 0, 23, 59)] }],
      choghadiyaDay: [
        { name: "Amrut (demo)", type: "Most Auspicious", start: "06:15", end: "07:45" },
        { name: "Kaal (demo)", type: "Inauspicious", start: "07:45", end: "09:15" },
      ],
      choghadiyaNight: [{ name: "Shubh (demo)", type: "Most Auspicious", start: "18:45", end: "20:15" }],
      auspicious: [{ name: "Abhijit Muhurat (demo)", type: "Auspicious", windows: [demoWindow(12, 0, 12, 48)] }],
      inauspicious: [{ name: "Rahu Kaal (demo)", type: "Inauspicious", windows: [demoWindow(16, 30, 18, 0)] }],
    };
  }
}

type ApiPeriodEntry = { name: string; type: string; start?: string; end?: string; period?: TimeWindow[] };

function toTimeOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : iso;
}

/**
 * Tithi/nakshatra/yoga/karana windows can span up to ~27 hours — stripping
 * straight to HH:MM (as choghadiya slots do, where sequence makes an
 * overnight wrap obvious) made a same-day-looking pair like "07:58 → 07:55"
 * read as backwards/broken. Mark the end time "(+1)" whenever its calendar
 * date differs from the start's.
 */
function toWindow(w: TimeWindow): TimeWindow {
  const startDate = w.start?.slice(0, 10);
  const endDate = w.end?.slice(0, 10);
  const start = toTimeOnly(w.start) ?? w.start;
  const end = toTimeOnly(w.end) ?? w.end;
  return { start, end: startDate && endDate && endDate > startDate ? `${end} (+1)` : end };
}

function toPeriod(entry: ApiPeriodEntry): PanchangPeriod {
  const raw = entry.period ?? (entry.start && entry.end ? [{ start: entry.start, end: entry.end }] : []);
  return { name: entry.name, type: entry.type ?? "", windows: raw.map(toWindow) };
}

class ProkeralaPanchangProvider implements PanchangProvider {
  async getPanchang(input: PanchangInput): Promise<PanchangResult> {
    const token = await getProkeralaToken();
    const qs = new URLSearchParams({
      ayanamsa: "1",
      coordinates: `${input.latitude},${input.longitude}`,
      datetime: input.datetime,
      la: "en",
    }).toString();
    const authHeaders = { Authorization: `Bearer ${token}` };

    const endpoints = ["panchang", "choghadiya", "auspicious-period", "inauspicious-period"] as const;
    const responses = await Promise.all(
      endpoints.map((ep) => fetch(`https://api.prokerala.com/v2/astrology/${ep}?${qs}`, { headers: authHeaders }))
    );

    for (const [i, res] of responses.entries()) {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Prokerala ${endpoints[i]} API error ${res.status}: ${body.slice(0, 300)}`);
      }
    }

    const [panchangRes, choghadiyaRes, auspiciousRes, inauspiciousRes] = await Promise.all(responses.map((r) => r.json()));

    const p = panchangRes?.data ?? {};
    const choghadiyaSlots: Array<{ name: string; type: string; is_day: boolean; start: string; end: string }> =
      choghadiyaRes?.data?.muhurat ?? [];

    return {
      provider: "prokerala",
      isDemoData: false,
      configRequired: false,
      vaara: p.vaara ?? null,
      sunrise: toTimeOnly(p.sunrise),
      sunset: toTimeOnly(p.sunset),
      moonrise: toTimeOnly(p.moonrise),
      moonset: toTimeOnly(p.moonset),
      tithi: (p.tithi ?? []).map(toPeriod),
      nakshatra: (p.nakshatra ?? []).map(toPeriod),
      yoga: (p.yoga ?? []).map(toPeriod),
      karana: (p.karana ?? []).map(toPeriod),
      choghadiyaDay: choghadiyaSlots
        .filter((s) => s.is_day)
        .map((s) => ({ name: s.name, type: s.type, start: toTimeOnly(s.start) ?? s.start, end: toTimeOnly(s.end) ?? s.end })),
      choghadiyaNight: choghadiyaSlots
        .filter((s) => !s.is_day)
        .map((s) => ({ name: s.name, type: s.type, start: toTimeOnly(s.start) ?? s.start, end: toTimeOnly(s.end) ?? s.end })),
      auspicious: (auspiciousRes?.data?.muhurat ?? []).map(toPeriod),
      inauspicious: (inauspiciousRes?.data?.muhurat ?? []).map(toPeriod),
    };
  }
}

export function getPanchangProvider(): PanchangProvider {
  return process.env.ASTROLOGY_PROVIDER === "prokerala" ? new ProkeralaPanchangProvider() : new MockPanchangProvider();
}

// ---------------------------------------------------------------------------
// DB-backed cache (PanchangCache table) — panchang for a given day/place
// doesn't change, and this endpoint is public (no login, no
// rate-limit-by-credit), so caching keeps repeat page loads from re-hitting
// Prokerala. DB-backed rather than in-memory because Prokerala's
// account-wide rate limit (5 requests/60s) makes a month view (up to 31
// calls) far too slow to compute live in one request — a daily cron
// (/api/cron/prefill-panchang) pre-fills days ahead of time, and this cache
// is what makes that warmup actually pay off (in-memory would be wiped
// between the cron's serverless invocation and the next user request). Also
// survives restarts/multiple instances, unlike the old in-memory version.
// A small in-memory layer sits on top purely to skip a DB round-trip for
// repeat reads within the same process/request burst.
// ---------------------------------------------------------------------------
import { prisma } from "@/lib/prisma";

const MEMORY_TTL_MS = 5 * 60 * 1000;
const memory = new Map<string, { value: PanchangResult; expiresAt: number }>();

function round(n: number): number {
  return Math.round(n * 100) / 100; // ~1km precision — plenty for panchang
}

function cacheKey(latitude: number, longitude: number, date: string): string {
  return `${round(latitude)},${round(longitude)}|${date}`;
}

async function readDbCache(latitude: number, longitude: number, date: string): Promise<PanchangResult | null> {
  const row = await prisma.panchangCache.findUnique({
    where: { latitude_longitude_date: { latitude: round(latitude), longitude: round(longitude), date: new Date(`${date}T00:00:00.000Z`) } },
  });
  return (row?.data as PanchangResult | undefined) ?? null;
}

async function writeDbCache(latitude: number, longitude: number, date: string, value: PanchangResult): Promise<void> {
  const where = { latitude_longitude_date: { latitude: round(latitude), longitude: round(longitude), date: new Date(`${date}T00:00:00.000Z`) } };
  await prisma.panchangCache.upsert({
    where,
    create: { latitude: round(latitude), longitude: round(longitude), date: new Date(`${date}T00:00:00.000Z`), data: value as object },
    update: { data: value as object },
  });
}

/** DB-only existence check, no network call — lets the prefill cron pace itself (only live-fetched days count against Prokerala's rate limit, already-cached days are free). */
export async function isPanchangCached(latitude: number, longitude: number, date: string): Promise<boolean> {
  const key = cacheKey(latitude, longitude, date);
  const memHit = memory.get(key);
  if (memHit && memHit.expiresAt > Date.now()) return true;
  return (await readDbCache(latitude, longitude, date)) !== null;
}

export async function getCachedPanchang(input: PanchangInput): Promise<PanchangResult> {
  const date = input.datetime.slice(0, 10);
  const key = cacheKey(input.latitude, input.longitude, date);

  const memHit = memory.get(key);
  if (memHit && memHit.expiresAt > Date.now()) return memHit.value;

  const dbHit = await readDbCache(input.latitude, input.longitude, date);
  if (dbHit) {
    memory.set(key, { value: dbHit, expiresAt: Date.now() + MEMORY_TTL_MS });
    return dbHit;
  }

  const value = await getPanchangProvider().getPanchang(input);
  memory.set(key, { value, expiresAt: Date.now() + MEMORY_TTL_MS });
  await writeDbCache(input.latitude, input.longitude, date, value);
  return value;
}

/**
 * For the month view — returns whatever's already cached (DB, instant) plus
 * live-fetches up to `maxLiveFetches` of the still-missing dates (staying
 * safely under Prokerala's 5-req/60s cap in a single request). Any dates
 * beyond that cap come back as `null`; the daily cron
 * (/api/cron/prefill-panchang) is what keeps this list short in practice —
 * this cap just keeps a single request from ever blocking for minutes.
 *
 * Default is 1, not higher — ProkeralaPanchangProvider.getPanchang makes
 * FOUR Prokerala requests per date (panchang/choghadiya/auspicious/
 * inauspicious in parallel), so even 2 missing dates in one call would
 * already risk tripping the 5-req/60s cap (found live: fetching 4 dates
 * fired 16 requests and only the first date came back before 429s ate the
 * rest, silently, since each date's fetch is wrapped in its own try/catch).
 */
export async function getPanchangForDates(
  latitude: number,
  longitude: number,
  timezone: string,
  dates: string[],
  maxLiveFetches = 1
): Promise<Record<string, PanchangResult | null>> {
  const result: Record<string, PanchangResult | null> = {};
  const missing: string[] = [];

  for (const date of dates) {
    const key = cacheKey(latitude, longitude, date);
    const memHit = memory.get(key);
    if (memHit && memHit.expiresAt > Date.now()) {
      result[date] = memHit.value;
      continue;
    }
    const dbHit = await readDbCache(latitude, longitude, date);
    if (dbHit) {
      memory.set(key, { value: dbHit, expiresAt: Date.now() + MEMORY_TTL_MS });
      result[date] = dbHit;
    } else {
      missing.push(date);
    }
  }

  for (const date of missing.slice(0, maxLiveFetches)) {
    try {
      const datetime = buildLocalMorningDateTime(date, timezone);
      const value = await getPanchangProvider().getPanchang({ latitude, longitude, datetime });
      memory.set(cacheKey(latitude, longitude, date), { value, expiresAt: Date.now() + MEMORY_TTL_MS });
      await writeDbCache(latitude, longitude, date, value);
      result[date] = value;
    } catch {
      result[date] = null;
    }
  }
  for (const date of missing.slice(maxLiveFetches)) {
    result[date] = null;
  }

  return result;
}

/** Builds an ISO8601 datetime at 06:00 local time for the given date+timezone — any instant within the target day works, since the panchang windows already span the whole day. Exported for reuse by the API routes. */
export function buildLocalMorningDateTime(dateStr: string, timeZone: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const approx = new Date(Date.UTC(y, m - 1, d, 6));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(approx);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T06:00:00${offset || "+00:00"}`;
}
