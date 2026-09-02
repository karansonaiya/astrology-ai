import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { careerInsightSchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { getOrComputeKundliCalculation, summarizeKundliForAi } from "@/lib/astrology/adapter";
import type { AppLocale } from "@/lib/i18n/config";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = careerInsightSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    try {
      await consumeQuestionCredit(user.id, "career");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;
    const d = parsed.data;

    // Same fix as entitlement.ts's report generation: this whole prompt is
    // written by us in English (unlike chat, where the user's own message
    // signals the language) — spelling the target language out explicitly
    // here, not just relying on the system prompt, reliably keeps the reply
    // in the account's actual locale instead of defaulting to English.
    const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
    const prompt = `The user wants career/business reflection. Current work/study: ${d.currentWork}. Key skills: ${d.skills}. Goals: ${d.goals}. Time horizon: ${d.timeHorizon}. Main concern: ${d.mainConcern}.
Combine general reflective, astrology-style interpretation with concrete, non-financial planning suggestions (e.g. skills to build, conversations to have, small experiments to try). Do not suggest quitting a job, taking a loan, investing, or gambling. Write your entire answer in ${langName[locale]}.`;

    // Ground the insight in the user's REAL calculated chart when one's
    // available — same fix/reasoning as the chat route: this feature is
    // billed as astrology-based, so it should actually use the astrology
    // data this app calculates, not just generic AI advice on the form
    // answers. Best-effort: falls back to no chart context on any failure.
    const birthProfile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    let birthContext: string | undefined;
    if (birthProfile) {
      try {
        const calc = await getOrComputeKundliCalculation(birthProfile);
        birthContext = summarizeKundliForAi(calc);
      } catch {
        // fall through — insight still works without chart grounding
      }
    }

    const reply = await generateAstrologyReply({
      userId: user.id,
      locale,
      history: [],
      userMessage: prompt,
      birthContext,
      feature: "career",
    });

    return NextResponse.json({ text: reply.text });
  } catch (err) {
    return errorResponse(err);
  }
}
