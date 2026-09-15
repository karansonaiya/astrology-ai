import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getOrComputeKundliCalculation } from "@/lib/astrology/adapter";
import { getRealKaalSarpDosha, KAAL_SARP_REMEDIES } from "@/lib/astrology/kaal-sarp";
import { getRealSadeSatiStatus, SADE_SATI_REMEDIES } from "@/lib/astrology/sade-sati";
import { generateDoshaTransitReading } from "@/lib/ai/dosha-transit-reading";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";
import type { ZodiacSign } from "@prisma/client";

/**
 * Free tier — uses the user's own saved birth profile (like /api/mangal-
 * dosha). Kaal Sarp Dosha needs only real sign+degree (available even
 * without a known birth time, unlike Mangal Dosha); Sade Sati needs only
 * the real natal Moon sign plus the real current Saturn transit — neither
 * strictly requires an exact birth time, unlike Mangal Dosha's ascendant
 * dependency.
 */
export async function POST() {
  try {
    const user = await requireUser();

    const profile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!profile) return NextResponse.json({ error: "no_birth_profile" }, { status: 422 });
    if (profile.latitude == null || profile.longitude == null) {
      return NextResponse.json({ error: "chart_unavailable" }, { status: 422 });
    }

    const calc = await getOrComputeKundliCalculation(profile);
    if (!calc.moonSign || !calc.planetaryPositions) {
      return NextResponse.json({ error: "chart_unavailable" }, { status: 422 });
    }

    // calc.planetaryPositions is a Prisma Json column, typed loosely by
    // default — cast back to the real shape adapter.ts always writes there.
    const planetaryPositions = calc.planetaryPositions as unknown as {
      planet: string;
      sign: ZodiacSign;
      degree: number;
      house: number | null;
    }[];

    const [kaalSarp, sadeSati] = await Promise.all([
      Promise.resolve(getRealKaalSarpDosha(planetaryPositions)),
      getRealSadeSatiStatus(calc.moonSign, profile.latitude, profile.longitude),
    ]);

    try {
      await consumeQuestionCredit(user.id, "kaal-sarp-sade-sati");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const remedies = [...KAAL_SARP_REMEDIES, ...SADE_SATI_REMEDIES];
    const reading = await generateDoshaTransitReading(kaalSarp, sadeSati, remedies, locale);

    return NextResponse.json({ kaalSarp, sadeSati, reading });
  } catch (err) {
    return errorResponse(err);
  }
}
