import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { numerologySchema } from "@/lib/validations/numerology";
import { calculateNumerology } from "@/lib/numerology/calculate";
import { generateNumerologyReading } from "@/lib/ai/numerology-reading";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
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

    try {
      await consumeQuestionCredit(user.id, "numerology");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const numbers = calculateNumerology(parsed.data.name, new Date(`${parsed.data.birthDate}T00:00:00.000Z`));
    const reading = await generateNumerologyReading(numbers, locale);

    return NextResponse.json({ reading });
  } catch (err) {
    return errorResponse(err);
  }
}
