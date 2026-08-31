import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { generateHoroscopesForDate, type GenerateHoroscopesResult } from "@/lib/horoscope-automation";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

const LOCALES = ["en", "hi", "gu"] as const;

const generateSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
  periodDate: z.string().date(),
  signs: z.array(z.enum(ZODIAC_SIGNS)).min(1).optional(), // defaults to all 12
});

// Deliberately generates for ALL THREE locales every time, not a
// locale picked in the UI — the previous per-locale version let an admin
// generate+publish "en" and genuinely forget "hi"/"gu" existed, and the
// public site then showed "not published" for anyone on Gujarati/Hindi.
// The app is Gujarati/Hindi/English by design (see CLAUDE.md's i18n rule) —
// there's no reason this action should ever produce just one language.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["admin", "content_editor"]);
    const body = await req.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    const periodDate = new Date(`${parsed.data.periodDate}T00:00:00.000Z`);
    const results: Record<string, GenerateHoroscopesResult> = {};

    for (const locale of LOCALES) {
      // Manual admin trigger always lands as a draft — see CLAUDE.md:
      // publishing is a deliberate, separate human action. Only the
      // unattended cron path (/api/cron/generate-horoscopes) auto-publishes.
      results[locale] = await generateHoroscopesForDate({
        period: parsed.data.period,
        locale,
        periodDate,
        signs: parsed.data.signs,
        autoPublish: false,
        createdBy: admin.id,
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    return errorResponse(err);
  }
}
