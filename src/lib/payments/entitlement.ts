import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { CREDIT_PACKS, PALM_REPORT_CODES, NUMEROLOGY_REPORT_CODES } from "@/lib/pricing/catalog";
import { generateAstrologyReply } from "@/lib/ai";
import { getOrComputeKundliCalculation, summarizeKundliForAi } from "@/lib/astrology/adapter";
import { calculateDetailedNumerology } from "@/lib/numerology/calculate";
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
      // Palm Report codes (a real uploaded photo, persisted at
      // create-order time — see create-order/route.ts) need a different,
      // vision-grounded generation path; the Numerology Report code needs a
      // real name+birthDate captured the same way. Every other template
      // keeps using the existing birth-chart-only path unchanged.
      let content;
      if (purchase.template && PALM_REPORT_CODES.has(purchase.template.code) && purchase.photoData && purchase.photoMimeType) {
        content = await generatePalmReportContent(
          purchase.userId,
          purchase.template.code,
          purchase.template.name,
          purchase.birthProfileId,
          { data: purchase.photoData, mimeType: purchase.photoMimeType }
        );
      } else if (
        purchase.template &&
        NUMEROLOGY_REPORT_CODES.has(purchase.template.code) &&
        purchase.numerologyName &&
        purchase.numerologyBirthDate
      ) {
        content = await generateDetailedNumerologyReportContent(
          purchase.userId,
          purchase.template.name,
          purchase.numerologyName,
          purchase.numerologyBirthDate
        );
      } else {
        content = await generateReportContent(purchase.userId, purchase.templateId, purchase.birthProfileId);
      }
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

// Per-tier structure instructions for the 4 Palm Report codes (see
// pricing/catalog.ts's PALM_REPORT_CODES). Each is deliberately specific
// about which real, actually-visible palmistry features to ground the
// reading in — not a generic "write about palms" prompt — same "must read
// as substantial, not generic" standard as generateReportContent above.
const PALM_TIER_STRUCTURE: Record<string, string> = {
  palm_career_report: `Structure it as:
1. An opening overview (4-6 sentences) of the hand shape/type you actually observe and what it traditionally suggests about temperament.
2. A deep dive into career-relevant signs actually visible in the photo — the Head Line's length/depth/slope (decision-making and thinking style), the Fate Line if visible (career direction and stability), the Jupiter mount (leadership/ambition), the Saturn mount (discipline/responsibility), and the Sun/Apollo mount (recognition and success) — each its own section, 3-5 sentences of real, photo-specific reasoning naming the actual feature and what you observe about it.
3. 5-7 concrete, actionable career/professional-growth suggestions.
4. A closing reflection (3-4 sentences).`,
  palm_love_marriage_report: `Structure it as:
1. An opening overview (4-6 sentences) of the hand shape/type you actually observe.
2. A deep dive into love/relationship-relevant signs actually visible — the Heart Line's length/curve/depth (emotional style), the Venus mount (warmth/affection), and any marriage lines (the small horizontal lines on the side of the palm just below the little finger) if actually visible, plus the Mount of Moon if relevant — each its own section, 3-5 sentences of real, photo-specific reasoning.
3. 5-7 concrete, reflective suggestions for relationships/marriage.
4. A closing reflection (3-4 sentences).`,
  palm_full_report: `Structure it as:
1. An opening overview (4-6 sentences) of the hand shape/type, size, and texture you actually observe.
2. A comprehensive section-by-section reading of EVERY major line and mount actually visible — Life Line, Heart Line, Head Line, Fate Line (if visible), and the Jupiter/Saturn/Sun/Mercury/Venus/Moon mounts — each its own section, 3-5 sentences of real, photo-specific reasoning covering career, relationships, temperament, and general life themes together.
3. 5-7 concrete, actionable suggestions across life areas.
4. A closing reflection (3-4 sentences).`,
  palm_kundli_combined_report: `Structure it as:
1. An opening overview (4-6 sentences) of the hand shape/type you actually observe in the photo.
2. A palm reading section covering the major lines and mounts actually visible (Life Line, Heart Line, Head Line, Fate Line if visible, key mounts).
3. A section connecting the palm's real, photo-specific indications to the real birth chart placements given below whenever there is a natural overlap (e.g. a strong Jupiter mount alongside a well-placed Jupiter in the chart) — only draw a connection where one genuinely exists, don't force one.
4. 5-7 concrete, actionable suggestions drawing on both the palm and the chart.
5. A closing reflection (3-4 sentences) tying palm and chart together.

Ground the chart-related parts in the real chart data provided below.`,
};

async function generatePalmReportContent(
  userId: string,
  templateCode: string,
  templateName: string,
  birthProfileId: string | null,
  photo: { data: Uint8Array; mimeType: string }
) {
  const [profile, user] = await Promise.all([
    // Only the "combined" tier actually uses birth data — see
    // PALM_TIER_STRUCTURE — but this is read the same defense-in-depth way
    // as generateReportContent above regardless of tier, for consistency.
    birthProfileId ? prisma.birthProfile.findFirst({ where: { id: birthProfileId, userId } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const isCombined = templateCode === "palm_kundli_combined_report";
  let birthContext: string | undefined;
  if (isCombined && profile) {
    const dateContext = `Birth date: ${profile.birthDate.toISOString().slice(0, 10)}. Birth time: ${
      profile.birthTimeKnown && profile.birthTime ? profile.birthTime : "unknown"
    }. Birth place: ${profile.birthCity ?? "unknown"}.`;
    let kundliSummary: string | undefined;
    try {
      const calc = await getOrComputeKundliCalculation(profile);
      kundliSummary = summarizeKundliForAi(calc);
    } catch {
      // fall through — combined report still generates from the photo alone
    }
    birthContext = [dateContext, kundliSummary].filter(Boolean).join(" ") || undefined;
  }

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `You are given a real photo of the customer's palm (attached), for a PAID, in-depth "${templateName}" palmistry (hast rekha) report, written entirely in ${langName[locale]}.

Analyze ONLY what is actually visible in the attached photo — never invent a line, mount, or mark you cannot see; if something (e.g. the fate line) is not clearly visible, explicitly say it is faint/not visible rather than inventing detail about it. Hard rule, no exceptions: never make any claim about physical wellbeing, longevity, or anything a person would need to see a doctor about — interpret the Life Line only as general vitality/energy, nothing else. Never claim certainty about the future. This is a paid product — it must read as substantial and genuinely valuable, grounded in specific real observations (name the actual feature and what you see: length, depth, curve, breaks, forks), never generic text that could describe any hand.

${PALM_TIER_STRUCTURE[templateCode] ?? PALM_TIER_STRUCTURE.palm_full_report}`,
    userImage: { data: Buffer.from(photo.data).toString("base64"), mimeType: photo.mimeType },
    birthContext,
    feature: "report",
    maxTokens: isCombined || templateCode === "palm_full_report" ? 7000 : 5000,
  });

  return {
    templateCode,
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: isCombined && !!profile,
    body: reply.text,
  };
}

/**
 * The Full Numerology Report — same free calculateNumerology/reading
 * pattern this app's free /numerology feature uses, taken one layer
 * deeper: calculateDetailedNumerology (calculate.ts) adds 3 more real,
 * deterministic numbers (Maturity, Personal Year, Karmic Debt) on top of
 * the free 5, then a single deep generateAstrologyReply call interprets
 * all 8 together — same markdown-body shape as every other Report Store
 * item (reports/[id]/page.tsx renders it generically), unlike the free
 * page's structured-JSON-per-card UI.
 */
async function generateDetailedNumerologyReportContent(userId: string, templateName: string, name: string, birthDate: Date) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const numbers = calculateDetailedNumerology(name, birthDate);
  const currentYear = new Date().getUTCFullYear();

  const numbersBlock = `Life Path Number: ${numbers.lifePath}
Destiny (Expression) Number: ${numbers.destiny}
Soul Urge Number: ${numbers.soulUrge}
Personality Number: ${numbers.personality}
Birthday Number: ${numbers.birthday}
Maturity Number: ${numbers.maturity}
Personal Year Number (for ${currentYear}): ${numbers.personalYear}
Karmic Debt numbers present: ${numbers.karmicDebtNumbers.length ? numbers.karmicDebtNumbers.join(", ") : "none"}`;

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are the real, already-calculated Pythagorean numerology numbers for "${name}" (born ${birthDate.toISOString().slice(0, 10)}) — never recalculate, question, or change them, only interpret exactly these numbers. Write entirely in ${langName[locale]}.

${numbersBlock}

This is a PAID, in-depth "${templateName}" — it must read as substantial and genuinely valuable, not a short summary. Structure it as:
1. An opening overview (4-6 sentences) tying the Life Path and Destiny numbers together as the core of this profile.
2. A dedicated section for each of: Life Path, Destiny, Soul Urge, Personality, Birthday, Maturity, and Personal Year — 3-5 sentences each, naming the actual number and interpreting it specifically.
3. If any Karmic Debt numbers are listed as present above, a dedicated section explaining what each one traditionally means and a constructive way to work with it; if none are present, skip this section entirely rather than inventing one.
4. 5-7 concrete, actionable suggestions grounded in these specific numbers.
5. A closing reflection (3-4 sentences).

Never give medical, legal, or financial advice. Never claim certainty about the future.`,
    feature: "report",
    maxTokens: 6000,
  });

  return {
    templateCode: "numerology_full_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}
