import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { kundliExplainSchema } from "@/lib/validations/kundli-explain";
import { getOrComputeKundliCalculation } from "@/lib/astrology/adapter";
import { generateKundliExplanation, type ExplainableChart } from "@/lib/ai/kundli-explanation";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { rateLimit } from "@/lib/rate-limit";
import type { AppLocale } from "@/lib/i18n/config";

const RATE_MAX = 10;
const RATE_WINDOW_SECONDS = 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const rl = await rateLimit("kundli-explain", user.id, RATE_MAX, RATE_WINDOW_SECONDS);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = kundliExplainSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    if (parsed.data.own) {
      const profile = await prisma.birthProfile.findFirst({ where: { userId: user.id, forSelf: true, deletedAt: null } });
      if (!profile) return NextResponse.json({ error: "no_birth_profile" }, { status: 404 });

      const calc = await getOrComputeKundliCalculation(profile);
      if (!calc.sunSign) return NextResponse.json({ error: "chart_not_available" }, { status: 422 });

      // Cached per locale — a repeat view (or a locale switch) either
      // returns instantly or regenerates, but never charges a second
      // credit for the SAME locale's already-generated reading.
      if (calc.explanation && calc.explanationLocale === locale) {
        return NextResponse.json({ explanation: calc.explanation });
      }

      try {
        await consumeQuestionCredit(user.id, `kundli-explain:${profile.id}`);
      } catch (err) {
        if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
        throw err;
      }

      const chart: ExplainableChart = {
        sunSign: calc.sunSign,
        moonSign: calc.moonSign,
        ascendant: calc.ascendant,
        nakshatra: calc.nakshatra,
        planetaryPositions: (calc.planetaryPositions as ExplainableChart["planetaryPositions"]) ?? null,
      };
      const explanation = await generateKundliExplanation(chart, locale, user.id, profile.name ?? undefined);

      await prisma.kundliCalculation.update({
        where: { id: calc.id },
        data: { explanation: explanation as object, explanationLocale: locale },
      });

      return NextResponse.json({ explanation });
    }

    // Ad-hoc "someone else's kundli" — not persisted, so not cached either;
    // consumes a credit on every generation (same cost as any other AI
    // feature — see credits.ts).
    if (!parsed.data.calculation) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    try {
      await consumeQuestionCredit(user.id, "kundli-explain:other");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const explanation = await generateKundliExplanation(parsed.data.calculation, locale, user.id, parsed.data.name);
    return NextResponse.json({ explanation });
  } catch (err) {
    return errorResponse(err);
  }
}
