import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { remedySchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import type { AppLocale } from "@/lib/i18n/config";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = remedySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "remedies"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;
    const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

    const userMessage = `A person describes this concern: ${parsed.data.concern.trim()}

Write entirely in ${langName[locale]}. Suggest 3-5 general traditional remedies relevant to this concern (from categories like: a specific gemstone, a day-of-week practice, a mantra/chant, a color to favor, a charitable act, a simple ritual) with one sentence each on the traditional reasoning. Never claim a guaranteed outcome, never suggest anything expensive or a specific paid product/vendor, never give medical/legal/financial advice — frame every suggestion as traditional practice for reflection and reassurance, not certainty.`;

    let reply;
    try {
      reply = await generateAstrologyReply({
        userId: user.id,
        locale,
        history: [],
        userMessage,
        feature: "remedies",
      });
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "remedies");
      console.error("[remedies] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ text: reply.text });
  } catch (err) {
    return errorResponse(err);
  }
}
