import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { vastuSchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { VASTU_PRINCIPLES, VASTU_DIRECTIONS, VASTU_ELEMENTS, type VastuElement } from "@/lib/vastu/catalog";
import type { AppLocale } from "@/lib/i18n/config";

const directionLabel = (d: string) => VASTU_DIRECTIONS.find((v) => v.value === d)?.label ?? d;
const elementLabel = (e: VastuElement) => VASTU_ELEMENTS.find((v) => v.value === e)?.label ?? e;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = vastuSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    let usedFree: boolean;
    try {
      ({ usedFree } = await consumeQuestionCredit(user.id, "vastu-shastra"));
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;
    const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

    // Real traditional facts (see vastu/catalog.ts) — trusted, server-authored
    // reference text, so it goes through birthContext (never classified),
    // same reasoning as compatibility's real chart data and tarot's real
    // card draw. Only the user's own free-typed concern becomes the
    // classified userMessage.
    const { propertyType, mainDoorDirection, elements, concern } = parsed.data;
    const mainDoorPrinciple = VASTU_PRINCIPLES.main_door;
    const lines = [
      `Main door faces ${directionLabel(mainDoorDirection)}. Traditional principle for the main door: favorable directions are ${mainDoorPrinciple.favorable.map(directionLabel).join(", ")}; unfavorable is ${mainDoorPrinciple.unfavorable.map(directionLabel).join(", ")}. Reasoning: ${mainDoorPrinciple.reasoning}`,
    ];
    for (const { element, direction } of elements) {
      const p = VASTU_PRINCIPLES[element];
      lines.push(
        `${elementLabel(element)} is placed in ${directionLabel(direction)}. Traditional principle: favorable directions are ${p.favorable.map(directionLabel).join(", ")}; unfavorable is ${p.unfavorable.map(directionLabel).join(", ")}. Reasoning: ${p.reasoning}`
      );
    }
    const birthContext = `Real traditional Vastu Shastra facts for this ${propertyType} (already determined, never alter these):\n${lines.join("\n")}`;

    const userMessage = `${concern?.trim() ? `My specific concern: ${concern.trim()}\n\n` : ""}Write entirely in ${langName[locale]}. Explain, one short section per item given above, whether each real placement is traditionally favorable or not and why, in plain warm language. If anything is traditionally unfavorable, suggest 1-2 traditional, low-cost Vastu remedies for it (a mirror, a specific color, a plant, a small structural adjustment) — never suggest breaking/rebuilding walls as the only option. End with a brief encouraging summary. Frame this as traditional guidance for reflection, not a certain prediction of outcomes.`;

    let reply;
    try {
      reply = await generateAstrologyReply({
        userId: user.id,
        locale,
        history: [],
        userMessage,
        birthContext,
        feature: "vastu-shastra",
      });
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, "vastu-shastra");
      console.error("[vastu-shastra] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    return NextResponse.json({ text: reply.text });
  } catch (err) {
    return errorResponse(err);
  }
}
