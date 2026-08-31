import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CREDIT_PACKS, FREE_QUESTIONS_CAP } from "@/lib/pricing/catalog";

export async function GET() {
  const [templates, plans] = await Promise.all([
    prisma.reportTemplate.findMany({ where: { active: true }, orderBy: { priceInPaise: "asc" } }),
    prisma.plan.findMany({ where: { active: true } }),
  ]);

  return NextResponse.json({ freeQuestionsCap: FREE_QUESTIONS_CAP, creditPacks: CREDIT_PACKS, templates, plans });
}
