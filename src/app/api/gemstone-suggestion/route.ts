import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getOrComputeKundliCalculation } from "@/lib/astrology/adapter";
import { getRealGemstoneRecommendation } from "@/lib/astrology/gemstones";
import type { ZodiacSign } from "@prisma/client";
import { generateGemstoneReading } from "@/lib/ai/gemstone-reading";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Free tier — uses the user's own saved birth profile (like /api/kundli),
 * not fresh birth details each time, since this is about the account
 * holder themselves. Deterministic parts (moon sign, ruling planet,
 * gemstone, Rudraksha mukhi, debilitated planets) cost nothing and aren't
 * credit-gated on their own — the AI explanation layered on top is, same
 * consistency rule as every other free AI feature.
 */
export async function POST() {
  try {
    const user = await requireUser();

    const profile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!profile) return NextResponse.json({ error: "no_birth_profile" }, { status: 422 });

    const calc = await getOrComputeKundliCalculation(profile);
    if (!calc.moonSign || !calc.planetaryPositions) {
      return NextResponse.json({ error: "chart_unavailable" }, { status: 422 });
    }

    // calc.planetaryPositions is a Prisma Json column, typed loosely by
    // default — cast back to the real shape adapter.ts always writes there.
    const planetaryPositions = calc.planetaryPositions as unknown as { planet: string; sign: ZodiacSign }[];
    const recommendation = getRealGemstoneRecommendation(calc.moonSign, planetaryPositions);

    try {
      await consumeQuestionCredit(user.id, "gemstone-suggestion");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const reading = await generateGemstoneReading(recommendation, locale);

    return NextResponse.json({ recommendation, reading });
  } catch (err) {
    return errorResponse(err);
  }
}
