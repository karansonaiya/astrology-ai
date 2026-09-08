import { prisma } from "@/lib/prisma";

/**
 * Is this user currently inside a paid monthly-plan period? Used to hide ads
 * for Monthly Premium subscribers (see ad-slot.tsx and the pricing page's
 * "no ads" line) — not for gating any credit/feature logic, which already
 * goes through the credits system independently of this.
 *
 * `currentPeriodEnd` is set once at purchase time to +1 month (see
 * entitlement.ts's fulfillOrder) — there's no recurring auto-renewal wired
 * to a provider yet (see Subscription.providerSubscriptionId's comment), so
 * this is "did they pay for the period we're currently in", not "will this
 * silently keep renewing forever".
 */
export async function isActiveSubscriber(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active", currentPeriodEnd: { gte: new Date() } },
    select: { id: true },
  });
  return sub != null;
}
