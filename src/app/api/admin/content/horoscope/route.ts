import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const createSchema = z.object({
  zodiacSign: z.enum([
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
  ]),
  period: z.enum(["daily", "weekly", "monthly"]),
  locale: z.enum(["en", "hi", "gu"]),
  periodDate: z.string().date(),
  career: z.string().min(1),
  love: z.string().min(1),
  money: z.string().min(1),
  wellness: z.string().min(1),
  luckyColor: z.string().min(1),
  luckyNumber: z.string().min(1),
  reflection: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(["admin", "content_editor"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // A flat `take: 200` cap silently drops anything older than ~5-6 days
    // once daily generation is producing 36 rows/day (12 signs x 3 locales) —
    // found live, this was already close to happening. Scoping by a trailing
    // date window instead means the row count naturally stays bounded (a
    // period further back just falls out of the window, on purpose) rather
    // than an arbitrary cutoff that keeps shrinking in days-of-coverage as
    // volume grows. 45 days covers "did this month's content generate"
    // checks with room to spare; the admin dashboard's own summary endpoint
    // (see summary/route.ts) is what the per-date counter actually relies
    // on, so this list's window can stay generous without needing to be
    // exact for that purpose too.
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 45);

    const content = await prisma.horoscopeContent.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        periodDate: { gte: since },
      },
      orderBy: { periodDate: "desc" },
      take: 500,
    });
    return NextResponse.json({ content });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["admin", "content_editor"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    const content = await prisma.horoscopeContent.create({
      data: {
        ...parsed.data,
        periodDate: new Date(`${parsed.data.periodDate}T00:00:00.000Z`),
        status: "draft",
        createdBy: admin.id,
      },
    });

    return NextResponse.json({ content });
  } catch (err) {
    return errorResponse(err);
  }
}
