import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();

    const [me, referred] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } }),
      prisma.referral.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);

    const creditsEarned = referred
      .filter((r) => r.status === "rewarded")
      .reduce((sum, r) => sum + r.rewardCreditsGranted, 0);

    return NextResponse.json({
      referralCode: me?.referralCode,
      totalReferred: referred.length,
      creditsEarned,
      referrals: referred,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
