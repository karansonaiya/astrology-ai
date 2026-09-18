import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { tarotReadingSchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { drawThreeCardSpread } from "@/lib/tarot/draw";
import type { AppLocale } from "@/lib/i18n/config";

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

export async function GET() {
  try {
    const user = await requireUser();
    const readings = await prisma.tarotReading.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ readings });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = tarotReadingSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "tarot-reading"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const drawn = drawThreeCardSpread();
    const cards = drawn.map((d) => ({ code: d.card.code, name: d.card.name, orientation: d.orientation, position: d.position }));

    // Real facts here are just the real random draw itself (see draw.ts's
    // header comment) — trusted, server-generated text, so it goes through
    // birthContext (never classified), same reasoning as compatibility's
    // real chart/Guna Milan text. Only the user's own free-typed question
    // becomes the classified userMessage, matching career/relationship.
    const birthContext = `Real random tarot draw for a Past/Present/Future spread (already drawn, never alter or re-draw these):
${drawn.map((d) => `${d.position[0].toUpperCase()}${d.position.slice(1)} position: ${d.card.name} (${d.orientation}) — traditional meaning: ${d.orientation === "upright" ? d.card.uprightMeaning : d.card.reversedMeaning}.`).join("\n")}`;

    const langName = LANG_NAME[locale];
    const question = parsed.data.question?.trim();
    const userMessage = question
      ? `Give me a tarot reading for this question: ${question}`
      : "Give me a general tarot reading for guidance right now.";

    const prompt = `${userMessage}

Write entirely in ${langName}. Interpret the three real cards given above for the Past, Present, and Future positions, with one short section per position, then a brief closing summary tying them together. Ground every sentence in the specific real card and orientation given for that position — never invent or substitute a different card. Frame this as reflective guidance, not a certain prediction of the future.`;

    let reply;
    try {
      reply = await generateAstrologyReply({
        userId: user.id,
        locale,
        history: [],
        userMessage: prompt,
        birthContext,
        feature: "tarot",
      });
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "tarot-reading");
      console.error("[tarot-reading] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const reading = await prisma.tarotReading.create({
      data: {
        userId: user.id,
        question: question ?? null,
        cards,
        result: { text: reply.text },
      },
    });

    return NextResponse.json({ reading });
  } catch (err) {
    return errorResponse(err);
  }
}
