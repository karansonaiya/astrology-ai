import { prisma } from "@/lib/prisma";
import { FREE_QUESTIONS_CAP } from "@/lib/pricing/catalog";

export async function getOrCreateWallet(userId: string) {
  return prisma.creditWallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, freeQuestionsUsed: 0, freeQuestionsCap: FREE_QUESTIONS_CAP },
  });
}

export class OutOfCreditsError extends Error {
  constructor() {
    super("out_of_credits");
  }
}

/**
 * Consumes one AI "question" — first from the free quota, then from paid
 * credit balance. Throws OutOfCreditsError if neither is available.
 * Wrapped in a transaction so concurrent requests can't double-spend.
 */
export async function consumeQuestionCredit(userId: string, relatedEntity?: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0, freeQuestionsUsed: 0, freeQuestionsCap: FREE_QUESTIONS_CAP },
    });

    if (wallet.freeQuestionsUsed < wallet.freeQuestionsCap) {
      const updated = await tx.creditWallet.update({
        where: { userId },
        data: { freeQuestionsUsed: { increment: 1 } },
      });
      return { usedFree: true, wallet: updated };
    }

    if (wallet.balance <= 0) throw new OutOfCreditsError();

    const updated = await tx.creditWallet.update({
      where: { userId },
      data: { balance: { decrement: 1 } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "consume",
        amount: -1,
        balanceAfter: updated.balance,
        relatedEntity,
        description: "AI question",
      },
    });

    return { usedFree: false, wallet: updated };
  });
}

export async function grantCredits(
  userId: string,
  amount: number,
  type: "purchase" | "refund" | "referral_bonus" | "admin_adjust" | "free_grant",
  description?: string,
  relatedEntity?: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.creditWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0, freeQuestionsUsed: 0, freeQuestionsCap: FREE_QUESTIONS_CAP },
    });

    const updated = await tx.creditWallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: { userId, type, amount, balanceAfter: updated.balance, description, relatedEntity },
    });

    return updated;
  });
}
