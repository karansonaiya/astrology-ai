import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/auth/guard";
import type { HoroscopePeriod, Locale, ZodiacSign } from "@prisma/client";

function periodStart(period: HoroscopePeriod, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "daily") return d;
  if (period === "weekly") {
    const day = d.getUTCDay();
    const diff = (day + 6) % 7; // Monday-start week
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sign = searchParams.get("sign") as ZodiacSign | null;
    const period = (searchParams.get("period") as HoroscopePeriod | null) ?? "daily";
    const locale = (searchParams.get("locale") as Locale | null) ?? "en";

    if (!sign) return NextResponse.json({ error: "missing_sign" }, { status: 400 });

    const content = await prisma.horoscopeContent.findFirst({
      where: { zodiacSign: sign, period, locale, status: "published", periodDate: periodStart(period) },
    });

    if (!content) {
      return NextResponse.json({ published: false });
    }

    return NextResponse.json({ published: true, content });
  } catch (err) {
    return errorResponse(err);
  }
}
