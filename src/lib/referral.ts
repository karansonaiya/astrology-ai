import { Prisma } from "@prisma/client";
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

  try {
    await prisma.referral.create({
      data: { referrerId: referrer.id, referredUserId, code: referralCode, status: "pending" },
    });
  } catch (err) {
    // Found in a full audit: this read-then-create has an unguarded race —
    // two concurrent onboarding submissions for the same brand-new user
    // could both pass the `existing` check above before either write lands,
    // and the second hits `referredUserId`'s unique constraint. That's not
    // data corruption (the first write already linked the referral
    // correctly), just a redundant attempt — swallow exactly that one known
    // error code instead of surfacing a real 500 for what's actually a
    // harmless duplicate.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
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
 *
 * Found in a later full audit: that fix alone still allowed a real
 * SEQUENTIAL (not concurrent) failure to silently lose half a reward — the
 * claim above flips status to "rewarded" before either grantCredits call, so
 * if the referrer's grant succeeds but the referred user's then throws (a
 * transient DB error), the referral is already permanently "rewarded" and
 * the top-line status guard blocks every future call from ever completing
 * the missing half. Fixed the same way as fulfillOrder's report branch: each
 * grant is now its own independently idempotent step (checked against the
 * real CreditTransaction ledger, not the referral's own status), so a later
 * call — even one that finds status already "rewarded" from a prior partial
 * attempt — still completes whichever grant didn't land yet.
 */
export async function maybeRewardReferral(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: userId } });
  if (!referral || (referral.status !== "pending" && referral.status !== "rewarded")) return;

  const rule = (await prisma.referralRule.findUnique({ where: { key: "default" } })) ?? DEFAULT_REFERRAL_RULE;
  if ("active" in rule && rule.active === false) return;

  if (referral.status === "pending") {
    if (rule.triggerEvent === "first_purchase") {
      const paidOrderCount = await prisma.order.count({ where: { userId, status: "paid" } });
      if (paidOrderCount > 1) return; // reward only on the first paid order
    }

    const claim = await prisma.referral.updateMany({
      where: { id: referral.id, status: "pending" },
      data: { status: "rewarded", rewardCreditsGranted: rule.referredReward, completedAt: new Date() },
    });
    // Another concurrent call just won the claim — let it own the grants
    // below instead of racing it; this call is done.
    if (claim.count === 0) return;
  }

  const referrerGranted = await prisma.creditTransaction.findFirst({
    where: { relatedEntity: `referral:${referral.id}`, userId: referral.referrerId },
  });
  if (!referrerGranted) {
    await grantCredits(referral.referrerId, rule.referrerReward, "referral_bonus", "Referral reward", `referral:${referral.id}`);
  }

  const referredGranted = await prisma.creditTransaction.findFirst({
    where: { relatedEntity: `referral:${referral.id}`, userId: referral.referredUserId },
  });
  if (!referredGranted) {
    await grantCredits(referral.referredUserId, rule.referredReward, "referral_bonus", "Referral welcome bonus", `referral:${referral.id}`);
  }
}
