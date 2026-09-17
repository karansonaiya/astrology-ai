import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { chatImageSchema } from "@/lib/validations/chat";
import { generateFaceReading } from "@/lib/ai/face-reading";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";

const requestSchema = z.object({ image: chatImageSchema });

/**
 * Deliberately ephemeral, same as palm-reading — no FaceReading DB table. A
 * face photo is a real photo of the person, not data reasonably kept as a
 * permanent record; this analyzes it once and returns the reading, nothing
 * is written to the database beyond the usual credit-consumption ledger entry.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "face-reading"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    // Credit was already consumed above — if the vision call still fails (a
    // real, previously-unrefunded failure mode: a transient Gemini error),
    // that must not be a paid-for-nothing loss for the user.
    let reading;
    try {
      reading = await generateFaceReading(parsed.data.image, locale);
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "face-reading");
      console.error("[face-reading] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ reading });
  } catch (err) {
    return errorResponse(err);
  }
}
