import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { pujaGuidanceSchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { PUJA_CATALOG } from "@/lib/puja/catalog";
import type { AppLocale } from "@/lib/i18n/config";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = pujaGuidanceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "puja-services"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;
    const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

    // Real traditional catalog (see puja/catalog.ts) — trusted, server-
    // authored reference text via birthContext (never classified), same
    // reasoning as vastu-shastra/tarot. The model picks and explains from
    // this real list rather than inventing a puja name or claim about one.
    const birthContext = `Real traditional puja/ritual catalog (already determined, never invent one not on this list):\n${PUJA_CATALOG.map((p) => `${p.name} (code: ${p.code}) — for ${p.occasions.join(", ")} — ${p.significance}`).join("\n")}`;

    const userMessage = `A person describes this concern/occasion: ${parsed.data.concern.trim()}

Write entirely in ${langName[locale]}. Recommend 1-3 of the real pujas from the list above that are genuinely relevant to this concern, explaining each one's traditional significance in plain warm language and why it fits. Mention each recommended puja's exact name so it's recognizable. Never invent a puja not on the list. Frame this as traditional guidance for reflection, not a certain outcome, and never suggest a specific paid vendor.`;

    let reply;
    try {
      reply = await generateAstrologyReply({
        userId: user.id,
        locale,
        history: [],
        userMessage,
        birthContext,
        feature: "puja-services",
      });
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "puja-services");
      console.error("[puja-services] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ text: reply.text });
  } catch (err) {
    return errorResponse(err);
  }
}
