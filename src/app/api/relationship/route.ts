import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { relationshipInsightSchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import type { AppLocale } from "@/lib/i18n/config";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = relationshipInsightSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    try {
      await consumeQuestionCredit(user.id, "relationship");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const reply = await generateAstrologyReply({
      userId: user.id,
      locale,
      history: [],
      userMessage: parsed.data.situation,
      feature: "relationship",
    });

    return NextResponse.json({ text: reply.text });
  } catch (err) {
    return errorResponse(err);
  }
}
