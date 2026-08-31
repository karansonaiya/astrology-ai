import { prisma } from "@/lib/prisma";
import { generateHoroscopeDraft } from "@/lib/ai/horoscope-content";
import { ZODIAC_SIGNS, type ZodiacSign } from "@/lib/zodiac";
import type { AppLocale } from "@/lib/i18n/config";

// Small concurrency cap so a bulk "all 12 signs" generate doesn't fire 12
// simultaneous requests at the AI provider (rate limits, especially on a
// free-tier key) — still meaningfully faster than fully sequential.
const CONCURRENCY = 4;

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

  const outcomes = await mapWithConcurrency(toGenerate, CONCURRENCY, async (sign) => {
    try {
      const fields = await generateHoroscopeDraft(sign, period, locale);
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
