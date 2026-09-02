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

  // Found live: this whole prompt (system + user message) is written by us
  // in English, unlike chat where the user's own message naturally signals
  // the target language — the model picked up on that and replied in
  // English even for a Gujarati-locale account, despite policy.ts's system
  // prompt already saying "write in Gujarati". Spelling the language out
  // explicitly in the user-facing instruction itself (not just the system
  // prompt) reliably fixes this — same fix needed anywhere else a feature
  // constructs its own English prompt instead of relaying real user text.
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  // Found live: this is a PAID product (₹79-249) but the old prompt
  // literally said "keep it structured with short sections" and asked for
  // only 3-5 bullet points — so it read as thin/not worth paying for, even
  // though nothing was being truncated (3000 tokens was plenty of room for
  // what was actually being asked for). The fix is asking for real depth,
  // not just raising the token ceiling — done below, with maxTokens raised
  // too so the now-longer request has enough room to actually finish.
  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Generate a comprehensive, in-depth ${template?.name ?? "birth insight"} report, written entirely in ${langName[locale]}. This is a paid report — it must read as substantial and genuinely valuable, not a short summary.

Structure it as:
1. An opening overview (4-6 sentences) grounded in the specific real chart placements given below.
2. 4-6 distinct themed sections relevant to "${template?.name ?? "this report"}" — each 3-5 sentences of real, chart-specific reasoning (name the actual planet/house/sign it's based on, the way a real astrologer would say "because Mars sits in your 10th house..." — not generic advice that could apply to anyone).
3. 5-7 concrete, actionable suggestions — specific practical steps, not vague platitudes.
4. A closing reflection (3-4 sentences) tying the reading together.

Ground every section in the real chart data provided below whenever it's available.`,
    birthContext,
    feature: "report",
    // Raised alongside the deeper prompt above — this now asks for
    // genuinely more content, so it needs more room to finish without
    // truncating (see index.ts's MAX_OUTPUT_TOKENS comment on why Gemini's
    // thinking tokens make a generous budget necessary regardless).
    maxTokens: 6000,
  });

  return {
    templateCode: template?.code,
    templateName: template?.name,
    generatedAt: new Date().toISOString(),
    birthDataUsed: !!profile,
    body: reply.text,
  };
}
