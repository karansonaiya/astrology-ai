import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getOrComputeKundliCalculation } from "@/lib/astrology/adapter";
import { generateMangalDoshaReading } from "@/lib/ai/mangal-dosha-reading";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";
import type { MangalDosha } from "@/lib/astrology/adapter";

/**
 * Free tier — uses the user's own saved birth profile (like /api/kundli,
 * /api/gemstone-suggestion), not fresh birth details each time. Real
 * Mangal Dosha data (see adapter.ts's MangalDosha type) is only ever
 * computed when birth time is known — Mars's house placement relative to
 * the real ascendant is what the whole determination depends on.
 */
export async function POST() {
  try {
    const user = await requireUser();

    const profile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!profile) return NextResponse.json({ error: "no_birth_profile" }, { status: 422 });
    if (!profile.birthTimeKnown) return NextResponse.json({ error: "birth_time_required" }, { status: 422 });

    const calc = await getOrComputeKundliCalculation(profile);
    const mangalDosha = calc.mangalDosha as unknown as MangalDosha | null;
    if (!mangalDosha) return NextResponse.json({ error: "chart_unavailable" }, { status: 422 });

    try {
      await consumeQuestionCredit(user.id, "mangal-dosha");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const reading = await generateMangalDoshaReading(mangalDosha, locale);

    return NextResponse.json({ mangalDosha, reading });
  } catch (err) {
    return errorResponse(err);
  }
}
