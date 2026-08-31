import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getOrComputeKundliCalculation, birthDataCompleteness } from "@/lib/astrology/adapter";

export async function GET() {
  try {
    const user = await requireUser();

    const profile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ hasProfile: false });
    }

    const calc = await getOrComputeKundliCalculation(profile);

    return NextResponse.json({
      hasProfile: true,
      calculation: calc,
      completeness: birthDataCompleteness(profile),
      configRequired: process.env.ASTROLOGY_PROVIDER && process.env.ASTROLOGY_PROVIDER !== "mock" && !calc.sunSign,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
