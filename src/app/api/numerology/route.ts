import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { numerologySchema } from "@/lib/validations/numerology";
import { calculateNumerology } from "@/lib/numerology/calculate";
import { generateNumerologyReading } from "@/lib/ai/numerology-reading";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Deliberately ephemeral, same reasoning as /api/palm-reading - a one-off
 * calculation+reading, not saved as a permanent record (unlike a
 * BirthProfile, which is meant to be reused). Free-tier credit-gated, same
 * consistency rule as every other AI feature (CLAUDE.md's free-tier
 * section).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = numerologySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "numerology"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const birthDate = new Date(`${parsed.data.birthDate}T00:00:00.000Z`);
    const numbers = calculateNumerology(parsed.data.name, birthDate);
    // Credit was already consumed above — if the AI reading still fails (a
    // real, previously-unrefunded failure mode: a transient Gemini error),
    // that must not be a paid-for-nothing loss for the user.
    let reading;
    try {
      reading = await generateNumerologyReading(parsed.data.name, birthDate, numbers, locale);
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "numerology");
      console.error("[numerology] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ reading });
  } catch (err) {
    return errorResponse(err);
  }
}
