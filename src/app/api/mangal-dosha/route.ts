import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getOrComputeKundliCalculation } from "@/lib/astrology/adapter";
import { generateMangalDoshaReading } from "@/lib/ai/mangal-dosha-reading";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
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
    // Explicit check (an audit found this route relied only on the
    // downstream configRequired->mangalDosha:null fallback for this case,
    // unlike its sibling kaal-sarp-sade-sati route's direct check) —
    // harmless today, but a direct guard here doesn't depend on that
    // fallback shape staying the same.
    if (profile.latitude == null || profile.longitude == null) {
      return NextResponse.json({ error: "chart_unavailable" }, { status: 422 });
    }

    const calc = await getOrComputeKundliCalculation(profile);
    const mangalDosha = calc.mangalDosha as unknown as MangalDosha | null;
    if (!mangalDosha) return NextResponse.json({ error: "chart_unavailable" }, { status: 422 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "mangal-dosha"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    // Credit was already consumed above — if the AI reading still fails (a
    // real, previously-unrefunded failure mode: a transient Gemini error),
    // that must not be a paid-for-nothing loss for the user.
    let reading;
    try {
      reading = await generateMangalDoshaReading(mangalDosha, locale);
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "mangal-dosha");
      console.error("[mangal-dosha] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ mangalDosha, reading });
  } catch (err) {
    return errorResponse(err);
  }
}
