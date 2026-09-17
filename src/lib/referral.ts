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
 *
 * Found live in an audit: the old check-then-act (`referral.status !==
 * "pending"` read, then a plain `update` to "rewarded" only at the very
 * end) is not actually safe against concurrent calls, despite entitlement.ts's
 * docstring claiming `fulfillOrder` (this function's only caller) is safe to
 * invoke from both the client-verify route and the webhook — two concurrent
 * `fulfillOrder` calls for the same referred user's qualifying order would
 * both read status:"pending" before either write landed, and both grant the
 * bonus. Fixed the same way as fulfillOrder's own race (see its comment):
 * claim the pending->rewarded transition atomically via `updateMany`'s
 * affected-row count, and only grant credits if THIS call is the one that
 * actually won the claim.
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

    const claim = await prisma.referral.updateMany({
      where: { id: referral.id, status: "pending" },
      data: { status: "rewarded", rewardCreditsGranted: rule.referredReward, completedAt: new Date() },
    });
    if (claim.count === 0) return; // another concurrent call already claimed this referral

    await grantCredits(referral.referrerId, rule.referrerReward, "referral_bonus", "Referral reward", `referral:${referral.id}`);
    await grantCredits(referral.referredUserId, rule.referredReward, "referral_bonus", "Referral welcome bonus", `referral:${referral.id}`);
  }
}
