import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { DEFAULT_REFERRAL_RULE } from "@/lib/pricing/catalog";

/** Links a newly-created user to whoever referred them, guarding against self-referral. */
export async function linkReferral(referredUserId: string, referralCode: string) {
  if (!referralCode) return;

  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer || referrer.id === referredUserId) return; // no self-referral

  const existing = await prisma.referral.findUnique({ where: { referredUserId } });
  if (existing) return; // already linked

  await prisma.referral.create({
    data: { referrerId: referrer.id, referredUserId, code: referralCode, status: "pending" },
  });
}

/**
 * Called after a user's order is fulfilled. If the trigger event configured
 * in ReferralRule is "first_purchase" and this is the referred user's first
 * paid order, grants reward credits to both sides.
 */
export async function maybeRewardReferral(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: userId } });
  if (!referral || referral.status !== "pending") return;

  const rule = (await prisma.referralRule.findUnique({ where: { key: "default" } })) ?? DEFAULT_REFERRAL_RULE;
  if (!("active" in rule) || rule.active !== false) {
    if (rule.triggerEvent === "first_purchase") {
      const paidOrderCount = await prisma.order.count({ where: { userId, status: "paid" } });
      if (paidOrderCount > 1) return; // reward only on the first paid order
    }

    await grantCredits(referral.referrerId, rule.referrerReward, "referral_bonus", "Referral reward", `referral:${referral.id}`);
    await grantCredits(referral.referredUserId, rule.referredReward, "referral_bonus", "Referral welcome bonus", `referral:${referral.id}`);

    await prisma.referral.update({
      where: { id: referral.id },
      data: { status: "rewarded", rewardCreditsGranted: rule.referredReward, completedAt: new Date() },
    });
  }
}
