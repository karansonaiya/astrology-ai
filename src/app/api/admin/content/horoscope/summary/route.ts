import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

/**
 * Counts for one period+date combo, independent of the main GET's row list —
 * found live, that list's `take: 200` cap (36 rows/day of daily horoscope
 * content alone) silently drops rows older than about 5-6 DAYS, which would
 * have silently broken any "how much of today's content exists" check built
 * on top of it within less than a week of the admin content page shipping.
 * A dedicated count query, scoped to exactly the one date being checked,
 * can never be affected by how many other rows exist elsewhere.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(["admin", "content_editor"]);
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    const periodDate = searchParams.get("periodDate");
    if (!period || !periodDate) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const rows = await prisma.horoscopeContent.findMany({
      where: { period: period as never, periodDate: new Date(`${periodDate}T00:00:00.000Z`) },
      select: { locale: true, status: true },
    });

    const byLocale = { en: 0, hi: 0, gu: 0 } as Record<"en" | "hi" | "gu", number>;
    let published = 0;
    for (const r of rows) {
      if (r.locale in byLocale) byLocale[r.locale as "en" | "hi" | "gu"]++;
      if (r.status === "published") published++;
    }

    return NextResponse.json({
      total: rows.length,
      expected: ZODIAC_SIGNS.length * 3,
      published,
      byLocale,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
