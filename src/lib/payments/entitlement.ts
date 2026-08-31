import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { CREDIT_PACKS } from "@/lib/pricing/catalog";
import { generateAstrologyReply } from "@/lib/ai";
import { getOrComputeKundliCalculation, summarizeKundliForAi } from "@/lib/astrology/adapter";
import type { AppLocale } from "@/lib/i18n/config";
import { maybeRewardReferral } from "@/lib/referral";

/**
 * Grants whatever the order paid for. Idempotent: safe to call from both
 * the client-verification route and the webhook, since it checks the
 * order's current status before granting anything twice.
 */
export async function fulfillOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.status === "paid") return; // already fulfilled — idempotent no-op

  await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

  if (order.type === "credit_pack") {
    const pack = CREDIT_PACKS.find((p) => p.code === order.relatedId);
    if (pack) {
      await grantCredits(order.userId, pack.credits, "purchase", `Purchased ${pack.name}`, `order:${order.id}`);
    }
  }

  if (order.type === "report") {
    const purchase = await prisma.reportPurchase.findUnique({ where: { orderId: order.id }, include: { template: true, birthProfile: true, user: true } });
    if (purchase) {
      const content = await generateReportContent(purchase.userId, purchase.templateId, purchase.birthProfileId);
      await prisma.reportPurchase.update({
        where: { id: purchase.id },
        data: { status: "completed", generatedContent: content, completedAt: new Date() },
      });
    }
  }

  if (order.type === "subscription") {
    const plan = await prisma.plan.findFirst({ where: { code: order.relatedId ?? undefined } });
    if (plan) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await prisma.subscription.create({
        data: { userId: order.userId, planId: plan.id, currentPeriodEnd: periodEnd },
      });
      if (plan.creditsGranted > 0) {
        await grantCredits(order.userId, plan.creditsGranted, "purchase", `${plan.name} monthly credits`, `order:${order.id}`);
      }
    }
  }

  await maybeRewardReferral(order.userId);
}

async function generateReportContent(userId: string, templateId: string, birthProfileId: string | null) {
  const [template, profile, user] = await Promise.all([
    prisma.reportTemplate.findUnique({ where: { id: templateId } }),
    // Security: scoped by userId too, not just id — defense in depth on top
    // of the ownership check in create-order/route.ts, so this function
    // can never hand back another user's birth data/chart even if some
    // future caller forgets that check. See the note there for the
    // exploit this closes (found in security review).
    birthProfileId ? prisma.birthProfile.findFirst({ where: { id: birthProfileId, userId } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const locale = (user?.locale ?? "en") as AppLocale;
  const dateContext = profile
    ? `Birth date: ${profile.birthDate.toISOString().slice(0, 10)}. Birth time: ${
        profile.birthTimeKnown && profile.birthTime ? profile.birthTime : "unknown"
      }. Birth place: ${profile.birthCity ?? "unknown"}.`
    : undefined;

  // Same real-chart grounding as chat/compatibility (see adapter.ts) — a
  // *paid* report is exactly the place this matters most; best-effort, a
  // provider hiccup shouldn't block report generation.
  let kundliSummary: string | undefined;
  if (profile) {
    try {
      const calc = await getOrComputeKundliCalculation(profile);
      kundliSummary = summarizeKundliForAi(calc);
    } catch {
      // fall through — report still generates from date/time/place alone
    }
  }
  const birthContext = [dateContext, kundliSummary].filter(Boolean).join(" ") || undefined;

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Generate a ${template?.name ?? "birth insight"} report. Cover: overview, key themes, and 3-5 reflective, actionable suggestions. Keep it structured with short sections.`,
    birthContext,
    feature: "report",
    // A paid, multi-section report needs real room — the default chat
    // budget (700) was silently truncating this to a single sentence.
    maxTokens: 3000,
  });

  return {
    templateCode: template?.code,
    templateName: template?.name,
    generatedAt: new Date().toISOString(),
    birthDataUsed: !!profile,
    body: reply.text,
  };
}
