import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { CREDIT_PACKS, PALM_REPORT_CODES, NUMEROLOGY_REPORT_CODES, BABY_NAME_REPORT_CODES, GEMSTONE_REPORT_CODES, MUHURAT_REPORT_CODES, FACE_REPORT_CODES, MANGAL_DOSHA_REPORT_CODES, KAAL_SARP_SADE_SATI_REPORT_CODES } from "@/lib/pricing/catalog";
import type { MangalDosha } from "@/lib/astrology/adapter";
import { getRealKaalSarpDosha, KAAL_SARP_REMEDIES } from "@/lib/astrology/kaal-sarp";
import { getRealSadeSatiStatus, SADE_SATI_REMEDIES } from "@/lib/astrology/sade-sati";
import type { ZodiacSign } from "@prisma/client";
import { generateAstrologyReply } from "@/lib/ai";
import { getOrComputeKundliCalculation, summarizeKundliForAi, getCachedKundliByBirthDetails } from "@/lib/astrology/adapter";
import { calculateDetailedNumerology, calculateNumerologyRawComponents, calculateNumerology } from "@/lib/numerology/calculate";
import { getRealNamingSyllable } from "@/lib/naming/nakshatra-names";
import { generateBabyNameSuggestions } from "@/lib/ai/baby-name-suggestion";
import { getRealGemstoneRecommendation, getPlanetDignity } from "@/lib/astrology/gemstones";
import { getPanchangForDates } from "@/lib/astrology/panchang";
import { getRealMuhuratVerdict, type MuhuratEventType } from "@/lib/astrology/muhurat";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";
import type { AppLocale } from "@/lib/i18n/config";
import { maybeRewardReferral } from "@/lib/referral";

/**
 * Grants whatever the order paid for. Idempotent: safe to call from both
 * the client-verification route and the webhook, since it checks the
 * order's current status before granting anything twice.
 *
 * Found live 2026-09-16 (a real transient Prokerala rate-limit during
 * testing, not a code bug): the OLD version marked the order "paid" up
 * front, then generated report content — if generation threw for ANY
 * reason (a real AI/provider hiccup, not just this rate-limit case), the
 * order was already "paid" in the DB, so every later retry (the client's
 * own retry, or the webhook firing afterward) hit the early-return guard
 * and silently no-op'd forever. A real customer would have paid, gotten a
 * generic 500, and been left with a permanently "pending" report with NO
 * path to ever regenerate it — worse than a failed payment, since money
 * was actually taken. Fixed by separating "was this order already paid"
 * (still guards credit-granting/subscription-creation against a double
 * grant) from "does the report still need generating" (its own,
 * independent retry condition — purchase.status, not order.status) so a
 * transient generation failure stays retriable even after the order is
 * marked paid.
 */
export async function fulfillOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const alreadyPaid = order.status === "paid";
  if (!alreadyPaid) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });
  }

  if (order.type === "credit_pack" && !alreadyPaid) {
    const pack = CREDIT_PACKS.find((p) => p.code === order.relatedId);
    if (pack) {
      await grantCredits(order.userId, pack.credits, "purchase", `Purchased ${pack.name}`, `order:${order.id}`);
    }
  }

  if (order.type === "report") {
    const purchase = await prisma.reportPurchase.findUnique({ where: { orderId: order.id }, include: { template: true, birthProfile: true, user: true } });
    // purchase.status is the real completion marker here, independent of
    // order.status — this is what lets a retry after a transient
    // generation failure actually regenerate instead of silently no-op'ing.
    if (purchase && purchase.status !== "completed") {
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
      } else if (purchase.template && BABY_NAME_REPORT_CODES.has(purchase.template.code) && purchase.babyNameInput) {
        content = await generateBabyNameReportContent(purchase.userId, purchase.template.name, purchase.babyNameInput as BabyNameInput);
      } else if (purchase.template && GEMSTONE_REPORT_CODES.has(purchase.template.code)) {
        content = await generateGemstoneReportContent(purchase.userId, purchase.template.name, purchase.birthProfileId);
      } else if (purchase.template && MUHURAT_REPORT_CODES.has(purchase.template.code) && purchase.muhuratInput) {
        content = await generateMuhuratReportContent(purchase.userId, purchase.template.name, purchase.muhuratInput as MuhuratInput);
      } else if (purchase.template && FACE_REPORT_CODES.has(purchase.template.code) && purchase.photoData && purchase.photoMimeType) {
        content = await generateFaceReportContent(purchase.userId, purchase.template.name, { data: purchase.photoData, mimeType: purchase.photoMimeType });
      } else if (purchase.template && MANGAL_DOSHA_REPORT_CODES.has(purchase.template.code)) {
        content = await generateMangalDoshaReportContent(purchase.userId, purchase.template.name, purchase.birthProfileId);
      } else if (purchase.template && KAAL_SARP_SADE_SATI_REPORT_CODES.has(purchase.template.code)) {
        content = await generateKaalSarpSadeSatiReportContent(purchase.userId, purchase.template.name, purchase.birthProfileId);
      } else {
        content = await generateReportContent(purchase.userId, purchase.templateId, purchase.birthProfileId);
      }
      await prisma.reportPurchase.update({
        where: { id: purchase.id },
        data: { status: "completed", generatedContent: content, completedAt: new Date() },
      });
    }
  }

  if (order.type === "subscription" && !alreadyPaid) {
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
// Found live 2026-09-16: same "read short/generic" feedback the founder
// gave about the free readings (compared against Gemini's own much deeper
// answers) applies here too - and a PAID report must read as clearly
// deeper than the free one, not the same or less (each section here was
// only 3-5 sentences, no more than the free reading's per-line depth after
// that fix). Bumped to 6-8 sentences per section.
const PALM_TIER_STRUCTURE: Record<string, string> = {
  palm_career_report: `Structure it as:
1. An opening overview (5-7 sentences) of the hand shape/type you actually observe and what it traditionally suggests about temperament.
2. A deep dive into career-relevant signs actually visible in the photo — the Head Line's length/depth/slope (decision-making and thinking style), the Fate Line if visible (career direction and stability), the Jupiter mount (leadership/ambition), the Saturn mount (discipline/responsibility), and the Sun/Apollo mount (recognition and success) — each its own section, at least 6-8 sentences of real, photo-specific reasoning naming the actual feature and what you observe about it.
3. 5-7 concrete, actionable career/professional-growth suggestions.
4. A closing reflection (4-5 sentences).`,
  palm_love_marriage_report: `Structure it as:
1. An opening overview (5-7 sentences) of the hand shape/type you actually observe.
2. A deep dive into love/relationship-relevant signs actually visible — the Heart Line's length/curve/depth (emotional style), the Venus mount (warmth/affection), and any marriage lines (the small horizontal lines on the side of the palm just below the little finger) if actually visible, plus the Mount of Moon if relevant — each its own section, at least 6-8 sentences of real, photo-specific reasoning.
3. 5-7 concrete, reflective suggestions for relationships/marriage.
4. A closing reflection (4-5 sentences).`,
  palm_full_report: `Structure it as:
1. An opening overview (5-7 sentences) of the hand shape/type, size, and texture you actually observe.
2. A comprehensive section-by-section reading of EVERY major line and mount actually visible — Life Line, Heart Line, Head Line, Fate Line (if visible), and the Jupiter/Saturn/Sun/Mercury/Venus/Moon mounts — each its own section, at least 6-8 sentences of real, photo-specific reasoning covering career, relationships, temperament, and general life themes together.
3. 5-7 concrete, actionable suggestions across life areas.
4. A closing reflection (4-5 sentences).`,
  palm_kundli_combined_report: `Structure it as:
1. An opening overview (5-7 sentences) of the hand shape/type you actually observe in the photo.
2. A palm reading section covering the major lines and mounts actually visible (Life Line, Heart Line, Head Line, Fate Line if visible, key mounts), each its own sub-section of at least 6-8 sentences.
3. A section connecting the palm's real, photo-specific indications to the real birth chart placements given below whenever there is a natural overlap (e.g. a strong Jupiter mount alongside a well-placed Jupiter in the chart) — only draw a connection where one genuinely exists, don't force one.
4. 5-7 concrete, actionable suggestions drawing on both the palm and the chart.
5. A closing reflection (4-5 sentences) tying palm and chart together.

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
    // Raised alongside PALM_TIER_STRUCTURE's deeper per-section requirement above.
    maxTokens: isCombined || templateCode === "palm_full_report" ? 9000 : 7000,
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
  const raw = calculateNumerologyRawComponents(name, birthDate);
  const currentYear = new Date().getUTCFullYear();
  const currentYearDigitSum = String(currentYear).split("").reduce((sum, d) => sum + Number(d), 0);
  let currentYearReduced = currentYearDigitSum;
  while (currentYearReduced > 9 && currentYearReduced !== 11 && currentYearReduced !== 22 && currentYearReduced !== 33) {
    currentYearReduced = String(currentYearReduced).split("").reduce((sum, d) => sum + Number(d), 0);
  }

  // Same reasoning as numerology-reading.ts (the free reading): hand the
  // model the exact real arithmetic as GIVEN FACTS to narrate, rather than
  // leaving it to reconstruct/guess the calculation from just the final
  // number — an LLM is not reliably correct at that and would risk
  // narrating a plausible-looking but wrong calculation.
  const numbersBlock = `Life Path Number: ${numbers.lifePath}
  Real calculation: birth day ${raw.day} reduces to ${raw.dayReduced}; birth month ${raw.month} reduces to ${raw.monthReduced}; birth year ${raw.year} (digit sum ${raw.yearDigitSum}) reduces to ${raw.yearReduced}; ${raw.dayReduced}+${raw.monthReduced}+${raw.yearReduced} reduces to ${numbers.lifePath}.
Destiny (Expression) Number: ${numbers.destiny}
  Real calculation: every letter in "${name}" summed to ${raw.destinyRawSum}, reduces to ${numbers.destiny}.
Soul Urge Number: ${numbers.soulUrge}
  Real calculation: only the vowels in "${name}" summed to ${raw.soulUrgeRawSum}, reduces to ${numbers.soulUrge}.
Personality Number: ${numbers.personality}
  Real calculation: only the consonants in "${name}" summed to ${raw.personalityRawSum}, reduces to ${numbers.personality}.
Birthday Number: ${numbers.birthday}
  Real calculation: birth day ${raw.day} reduces to ${numbers.birthday}.
Maturity Number: ${numbers.maturity}
  Real calculation: Life Path ${numbers.lifePath} + Destiny ${numbers.destiny} reduces to ${numbers.maturity}.
Personal Year Number (for ${currentYear}): ${numbers.personalYear}
  Real calculation: birth day ${raw.day} reduces to ${raw.dayReduced}; birth month ${raw.month} reduces to ${raw.monthReduced}; current year ${currentYear} (digit sum ${currentYearDigitSum}) reduces to ${currentYearReduced}; ${raw.dayReduced}+${raw.monthReduced}+${currentYearReduced} reduces to ${numbers.personalYear}.
Karmic Debt numbers present: ${numbers.karmicDebtNumbers.length ? numbers.karmicDebtNumbers.join(", ") : "none"}`;

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are the real, already-calculated Pythagorean numerology numbers for "${name}" (born ${birthDate.toISOString().slice(0, 10)}), with the exact real arithmetic behind each one — use these exact facts when narrating each calculation, never alter or re-derive them. Write entirely in ${langName[locale]}.

${numbersBlock}

This is a PAID, in-depth "${templateName}" — it must read as substantial and genuinely valuable, clearly deeper than a free reading, not a short summary. Structure it as:
1. An opening overview (5-7 sentences) tying the Life Path and Destiny numbers together as the core of this profile.
2. A dedicated section for each of: Life Path, Destiny, Soul Urge, Personality, Birthday, Maturity, and Personal Year — at least 6-8 sentences each: first accurately state the real calculation given above in plain language, then a rich, specific, in-depth interpretation.
3. If any Karmic Debt numbers are listed as present above, a dedicated section (at least 6-8 sentences) explaining what each one traditionally means and a constructive way to work with it; if none are present, skip this section entirely rather than inventing one.
4. 5-7 concrete, actionable suggestions grounded in these specific numbers.
5. A closing reflection (4-5 sentences).

Never give medical, legal, or financial advice. Never claim certainty about the future.`,
    feature: "report",
    maxTokens: 9000,
  });

  return {
    templateCode: "numerology_full_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}

/**
 * The Full Baby Name Report — same real Nakshatra+pada+syllable grounding
 * as the free /baby-names feature (see nakshatra-names.ts), taken deeper:
 * 30 names instead of 8, each also cross-checked against real Pythagorean
 * numerology (calculateNumerology run against the name + the child's real
 * birth date — same 100%-deterministic math the free /numerology feature
 * uses, zero AI involvement in computing the numbers themselves). Two AI
 * calls, not one: generateBabyNameSuggestions produces the real, honest
 * name+meaning list; this function's own generateAstrologyReply call only
 * formats that already-real content (plus the real numerology numbers)
 * into a well-organized report in the customer's own locale — never
 * inventing new names or altering a number.
 */
export type BabyNameInput = {
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime?: string;
  birthCity: string;
  birthCountry?: string;
  latitude?: number;
  longitude?: number;
  genderPreference: "boy" | "girl" | "any";
};

async function generateBabyNameReportContent(userId: string, templateName: string, input: BabyNameInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const failed = (reason: string) => ({
    templateCode: "baby_name_full_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: false,
    body: reason,
  });

  const geo =
    input.latitude != null && input.longitude != null
      ? { latitude: input.latitude, longitude: input.longitude, timezone: resolveTimezone(input.latitude, input.longitude) }
      : await geocodeBirthPlace(input.birthCity, input.birthCountry).catch(() => null);
  if (!geo || !geo.timezone) {
    return failed("We could not determine the birth place's coordinates, so this report could not be generated. Please contact support — you will not be charged for a report that didn't generate.");
  }

  const birthDateObj = new Date(`${input.birthDate}T00:00:00.000Z`);
  const calc = await getCachedKundliByBirthDetails({
    birthDate: birthDateObj,
    birthTimeKnown: input.birthTimeKnown,
    birthTime: input.birthTimeKnown ? input.birthTime ?? null : null,
    latitude: geo.latitude,
    longitude: geo.longitude,
    timezone: geo.timezone,
  });

  const syllable = getRealNamingSyllable(calc.nakshatraSyllables, calc.nakshatraPada);
  if (!calc.nakshatra || !syllable) {
    return failed("We could not determine the real Nakshatra for these birth details, so this report could not be generated. Please contact support — you will not be charged for a report that didn't generate.");
  }

  const suggestions = await generateBabyNameSuggestions(syllable, calc.nakshatra, input.genderPreference, 30, locale);

  const namesWithNumerology = suggestions.names.map((n) => {
    const numbers = calculateNumerology(n.name, birthDateObj);
    return `- ${n.name} (${n.gender}) — ${n.meaning} — Life Path ${numbers.lifePath}, Destiny ${numbers.destiny}`;
  });

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are 30 real, already-selected baby names for a child whose traditional Nakshatra-based starting syllable is "${syllable}" (Nakshatra: ${calc.nakshatra}), each with its given meaning and its real numerology Life Path and Destiny numbers — these are 100% real, already-calculated deterministic numbers (computed from the name and the child's real birth date), never alter or re-derive any of them. Write entirely in ${langName[locale]}.

${namesWithNumerology.join("\n")}

Write this up as a well-organized, in-depth "${templateName}". Structure it as:
1. An opening (3-4 sentences) about the real Nakshatra (${calc.nakshatra}) and starting syllable ("${syllable}") this report is grounded in, and briefly what the real Life Path/Destiny numbers given alongside each name represent.
2. Organize the 30 names into clear sections by gender (Boy Names / Girl Names / Unisex Names — skip any section with no names in it), presenting each name with its given meaning and its real Life Path/Destiny numbers stated exactly as given above.
3. A closing reflection (3-4 sentences) on choosing a name thoughtfully.

Never invent any name beyond the 30 given above. Never alter the meanings or numbers given. Never claim a name guarantees any outcome for the child. Never give medical, legal, or financial advice.`,
    feature: "report",
    maxTokens: 6000,
  });

  return {
    templateCode: "baby_name_full_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}

/**
 * The Full Gemstone & Rudraksha Report — same real Moon-sign-lord grounding
 * as the free /gemstone-suggestion feature (see gemstones.ts), taken
 * deeper: instead of just the primary Rashi Ratna recommendation, this
 * checks EVERY one of the person's real 7 classical planets for real
 * exaltation/debilitation (getPlanetDignity, same fixed classical tables,
 * zero AI involvement in the astrology itself), and hands the AI the full
 * real picture to explain — no special purchase-time input needed, reuses
 * the standard birthProfileId every basic report already accepts.
 */
async function generateGemstoneReportContent(userId: string, templateName: string, birthProfileId: string | null) {
  const [profile, user] = await Promise.all([
    birthProfileId ? prisma.birthProfile.findFirst({ where: { id: birthProfileId, userId } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  if (!profile) {
    return {
      templateCode: "gemstone_rudraksha_report",
      templateName,
      generatedAt: new Date().toISOString(),
      birthDataUsed: false,
      body: "This report needs your birth profile to determine your real chart. Please add your birth details and contact support — you will not be charged for a report that didn't generate.",
    };
  }

  const calc = await getOrComputeKundliCalculation(profile);
  if (!calc.moonSign || !calc.planetaryPositions) {
    return {
      templateCode: "gemstone_rudraksha_report",
      templateName,
      generatedAt: new Date().toISOString(),
      birthDataUsed: false,
      body: "We could not determine your real chart for this report. Please contact support — you will not be charged for a report that didn't generate.",
    };
  }

  // calc.planetaryPositions is a Prisma Json column, typed loosely by
  // default — cast back to the real shape adapter.ts always writes there.
  const planetaryPositions = calc.planetaryPositions as unknown as { planet: string; sign: import("@prisma/client").ZodiacSign }[];
  const recommendation = getRealGemstoneRecommendation(calc.moonSign, planetaryPositions);

  const classicalPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const dignityLines = planetaryPositions
    .filter((p) => classicalPlanets.includes(p.planet))
    .map((p) => `${p.planet} in ${p.sign} (${getPlanetDignity(p.planet, p.sign)})`)
    .join("; ");

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are the real facts for this person's real chart — never question, recalculate, or change any of them, only explain and give guidance around them. Write entirely in ${langName[locale]}.

Moon sign (Rashi): ${recommendation.moonSign}
Ruling planet of the Moon sign: ${recommendation.rulingPlanet}
Traditional primary gemstone for this planet: ${recommendation.gemstone[locale]}
Traditional primary Rudraksha mukhi for this planet: ${recommendation.rudrakshaMukhi}-mukhi
Real dignity of each of this person's 7 classical planets: ${dignityLines}

This is a PAID, in-depth "${templateName}" — it must read as substantial and genuinely valuable, clearly deeper than a free reading. Structure it as:
1. An opening overview (5-6 sentences) on the primary recommendation: the real Moon sign, its ruling planet, and the traditional gemstone/Rudraksha for it.
2. A section reviewing each of the 7 classical planets' real dignity given above — for any that are debilitated, name a traditional supportive gemstone/Rudraksha for that planet too (use standard classical associations: Sun-Ruby/1-mukhi, Moon-Pearl/2-mukhi, Mars-Red Coral/3-mukhi, Mercury-Emerald/4-mukhi, Jupiter-Yellow Sapphire/5-mukhi, Venus-Diamond/6-mukhi, Saturn-Blue Sapphire/7-mukhi) and 2-3 sentences of real, dignity-specific reasoning; for exalted or neutral planets, 1-2 sentences noting they don't need a supportive remedy.
3. Practical guidance (5-6 sentences): how these are traditionally worn/used, that a Rudraksha bead is a real, much cheaper alternative to a gemstone for the same planet, and a clear recommendation to consult a real, reputable jeweler/gemologist before buying any gemstone (real risk of low-quality or synthetic stones sold as genuine).
4. A closing reflection (3-4 sentences).

Hard rules: never claim a gemstone or Rudraksha guarantees any outcome — frame everything as traditional association, not a guaranteed effect. Never give financial advice about gemstone investment value. Never give medical advice.`,
    feature: "report",
    maxTokens: 7000,
  });

  return {
    templateCode: "gemstone_rudraksha_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}

/**
 * The 5-Day Muhurat Window Report — same real Choghadiya/Rahu-Kaal/Abhijit
 * grounding as the free /muhurat-finder feature (see muhurat.ts), taken
 * across 5 real consecutive days instead of the free page's single day.
 *
 * getPanchangForDates only live-fetches up to `maxLiveFetches` still-missing
 * days per call (Prokerala's 5-req/60s account cap — see panchang.ts's
 * header comment); any day beyond that, or any day whose live fetch itself
 * fails, comes back null and is simply left out of the report rather than
 * invented. If too FEW real days resolved to make a useful report (under 3
 * of 5), this throws instead of generating a thin/empty report — thanks to
 * fulfillOrder's retry fix above, that leaves the purchase safely retriable
 * (a later retry, once more days have cached via the daily prefill cron or
 * simply enough time has passed for the rate limit to clear, can succeed)
 * rather than permanently completing with too little real content.
 */
export type MuhuratInput = {
  eventType: MuhuratEventType;
  startDate: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

const EVENT_LABEL: Record<MuhuratEventType, string> = {
  general: "a general auspicious beginning",
  travel: "starting a journey/travel",
  business_start: "starting a business/new venture",
};

async function generateMuhuratReportContent(userId: string, templateName: string, input: MuhuratInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const failed = (reason: string) => ({
    templateCode: "muhurat_finder_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: false,
    body: reason,
  });

  const geo =
    input.latitude != null && input.longitude != null
      ? { latitude: input.latitude, longitude: input.longitude, timezone: resolveTimezone(input.latitude, input.longitude) }
      : await geocodeBirthPlace(input.city, input.country).catch(() => null);
  if (!geo || !geo.timezone) {
    return failed("We could not determine this city's coordinates, so this report could not be generated. Please contact support — you will not be charged for a report that didn't generate.");
  }

  const dates: string[] = [];
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const panchangByDate = await getPanchangForDates(geo.latitude, geo.longitude, geo.timezone, dates, 3);

  const verdicts = dates
    .filter((date) => panchangByDate[date] !== null)
    .map((date) => getRealMuhuratVerdict(panchangByDate[date]!, input.eventType, date));

  // A real generation failure (provider rate-limit, transient error) throws
  // deep inside getPanchangForDates' per-date try/catch and comes back as
  // `null` there rather than propagating — so an all-null result here still
  // needs its own explicit failure path, same "throw so the purchase stays
  // retriable" reasoning as the header comment above.
  if (verdicts.length < 3) {
    throw new Error(`Muhurat report: only ${verdicts.length}/5 days resolved real panchang data (rate-limited or provider hiccup) — leaving purchase pending for retry.`);
  }

  // Deterministic, code-computed "which real day stands out" — not an AI
  // judgment call: a day with a real event-specific favorable Choghadiya
  // (see muhurat.ts's isSpecialForEvent) ranks first, then by real
  // favorable-window count. Presented to the AI as a real fact to narrate,
  // same "AI never invents real data" principle as every other feature.
  const scored = [...verdicts].sort((a, b) => {
    const aSpecial = a.favorableWindows.some((w) => w.isSpecialForEvent) ? 1 : 0;
    const bSpecial = b.favorableWindows.some((w) => w.isSpecialForEvent) ? 1 : 0;
    if (aSpecial !== bSpecial) return bSpecial - aSpecial;
    return b.favorableWindows.length - a.favorableWindows.length;
  });
  const topPick = scored[0];

  const dayBlocks = verdicts
    .map((v) => {
      const favorableText = v.favorableWindows.length
        ? v.favorableWindows.map((w) => `${w.name} (${w.type}), ${w.start}–${w.end}${w.isSpecialForEvent ? " [especially recommended for this purpose]" : ""}`).join("; ")
        : "none";
      const avoidText = v.avoidWindows.length ? v.avoidWindows.map((w) => `${w.name}, ${w.start}–${w.end}`).join("; ") : "none";
      const abhijitText = v.abhijitWindow ? `${v.abhijitWindow.start}–${v.abhijitWindow.end}` : "not available";
      return `${v.date}${v.vaara ? ` (${v.vaara})` : ""}: favorable windows: ${favorableText}. Avoid: ${avoidText}. Abhijit Muhurat: ${abhijitText}.`;
    })
    .join("\n");

  const missingCount = 5 - verdicts.length;

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are the real, already-checked Panchang/Choghadiya facts for ${verdicts.length} of 5 real consecutive days starting ${input.startDate} in ${input.city}, for the purpose of ${EVENT_LABEL[input.eventType]} — never question, recalculate, or invent a window beyond exactly what is given below. Write entirely in ${langName[locale]}.

${dayBlocks}

The real day that stands out most for this purpose, based on the real data above, is ${topPick.date}${topPick.vaara ? ` (${topPick.vaara})` : ""}.
${missingCount > 0 ? `Note: ${missingCount} of the 5 days could not be checked due to a temporary data-provider limit — do not mention specific dates for these, just note briefly that a couple of days were not available to check.` : ""}

This is a PAID, in-depth "${templateName}" — it must read as substantial and genuinely valuable. Structure it as:
1. An opening overview (4-5 sentences) on the purpose and the real date range covered.
2. A day-by-day breakdown, one short section per day given above (3-4 sentences each), naming the real favorable/avoid windows and times.
3. A clear top recommendation section (4-5 sentences) on the single day/window that stands out most, as given above, and why.
4. Practical guidance (3-4 sentences) on how these windows are traditionally used.
5. A closing reflection (3-4 sentences).

Hard rules: never claim a time window guarantees any outcome — frame everything as traditional auspicious-timing guidance for reflection and intention, not a guarantee. Never give medical, legal, or financial advice.`,
    feature: "report",
    maxTokens: 7000,
  });

  return {
    templateCode: "muhurat_finder_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}

/**
 * The Full Face Reading Report — same real-photo, vision-grounded pattern
 * as the free /face-reading feature (see face-reading.ts), taken deeper:
 * 7 traditional features (forehead, eyebrows, eyes, nose, lips, chin, ears)
 * instead of 5, same warm/constructive safety framing throughout (see
 * face-reading.ts's header comment for why this needs extra care beyond
 * palm-reading.ts's safety rules — this is about a person's actual face).
 */
async function generateFaceReportContent(userId: string, templateName: string, photo: { data: Uint8Array; mimeType: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `You are given a real photo of the customer's face (attached), for a PAID, in-depth "${templateName}" traditional Samudrik Shastra (Vedic face reading) report, written entirely in ${langName[locale]}.

Describe ONLY what is actually visible in the attached photo — never invent a feature you cannot see; if a feature is not clearly visible (obscured by hair, angle, etc.), say so rather than inventing detail about it. This is a paid product — it must read as substantial and genuinely valuable, grounded in specific real observations, never generic text that could describe any face.

Hard rules, no exceptions: interpret ONLY the traditional SHAPE/PROPORTION of each feature — never make any claim, comparison, or judgment based on race, ethnicity, skin tone, caste, religion, gender, age, disability, body weight, or physical attractiveness. Never comment on skin condition, blemishes, marks, or complexion. Never assign a negative or insulting character trait to any feature — frame every traditional association warmly and constructively ("traditionally associated with...", never "you are..."); if a feature's traditional meaning in some texts reads negatively, either omit that feature or reframe it constructively. Never give a health, medical, or disability-related claim. Never claim certainty about the future. Never give legal or financial advice. This is traditional interpretation for reflection and self-understanding, never a judgment of a person's looks or worth.

Structure it as:
1. An opening overview (5-7 sentences) of the face shape/proportions you actually observe and what it traditionally suggests.
2. A deep dive into each traditional feature actually visible — Forehead, Eyebrows, Eyes, Nose, Lips, Chin, and Ears (only include Eyebrows/Ears if actually clearly visible) — each its own section, at least 6-8 sentences of real, photo-specific reasoning naming the actual feature and what you observe about its shape/proportion, then a warm traditional interpretation.
3. 5-7 concrete, reflective, constructive suggestions grounded in these observations.
4. A closing reflection (4-5 sentences).`,
    userImage: { data: Buffer.from(photo.data).toString("base64"), mimeType: photo.mimeType },
    feature: "report",
    maxTokens: 8000,
  });

  return {
    templateCode: "face_reading_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: false,
    body: reply.text,
  };
}

/**
 * The Detailed Mangal Dosha & Marriage Readiness Report — same real
 * Prokerala-computed dosha data as the free /mangal-dosha feature (see
 * adapter.ts's MangalDosha type), no special purchase-time input (reuses
 * the standard birthProfileId every basic report already accepts).
 */
async function generateMangalDoshaReportContent(userId: string, templateName: string, birthProfileId: string | null) {
  const [profile, user] = await Promise.all([
    birthProfileId ? prisma.birthProfile.findFirst({ where: { id: birthProfileId, userId } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const failed = (reason: string) => ({
    templateCode: "mangal_dosha_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: false,
    body: reason,
  });

  if (!profile || !profile.birthTimeKnown) {
    return failed("This report needs your real birth profile with a known birth time to determine Mangal Dosha (it depends on Mars's real house position). Please add your exact birth time and contact support — you will not be charged for a report that didn't generate.");
  }

  const calc = await getOrComputeKundliCalculation(profile);
  const mangalDosha = calc.mangalDosha as unknown as MangalDosha | null;
  if (!mangalDosha) {
    return failed("We could not determine your real Mangal Dosha result for this report. Please contact support — you will not be charged for a report that didn't generate.");
  }

  const exceptionsText = mangalDosha.exceptions.length ? mangalDosha.exceptions.join(" ") : "none";
  const remediesText = mangalDosha.remedies.length ? mangalDosha.remedies.join(" ") : "none";

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are the real, already-determined facts for this person's real chart — never question, recalculate, or change any of them, only explain and give calm context around them. Write entirely in ${langName[locale]}.

Mangal Dosha present: ${mangalDosha.hasDosha ? "yes" : "no"}
Real severity: ${mangalDosha.severity ?? "not applicable"}
Real description (from the provider): ${mangalDosha.description ?? "not applicable"}
Real exceptions: ${exceptionsText}
Real traditional remedies: ${remediesText}

This is a PAID, in-depth "${templateName}" — it must read as substantial and genuinely valuable, clearly deeper than a free reading. Structure it as:
1. An opening overview (5-6 sentences) on the real result above, calm and without alarm.
2. A section (5-7 sentences) explaining the real severity/description given above and what it traditionally means for marriage matching specifically.
3. A section (4-6 sentences) on the real exceptions given above (if any) and their traditional calming effect — if none were given, explicitly say none were found rather than inventing one.
4. A section (5-7 sentences) introducing the real traditional remedies given above as optional reference information — explicitly note they are not a requirement, and that a knowledgeable priest/astrologer should be consulted before undertaking any of them; if no dosha was found, instead write that no remedies are needed.
5. A closing reflection (4-5 sentences) noting that real marriage compatibility depends on many factors — communication, values, and mutual respect — far more than any single traditional factor.

Hard rules: never use fear tactics or present this as a certain misfortune. Never instruct spending money on any remedy. Never claim marriage compatibility depends on this factor alone. Never give medical, legal, or financial advice.`,
    feature: "report",
    maxTokens: 7000,
  });

  return {
    templateCode: "mangal_dosha_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}

/**
 * The Detailed Kaal Sarp Dosha & Sade Sati Report — same real, computed-
 * not-fetched data as the free /kaal-sarp-sade-sati feature (see
 * src/lib/astrology/kaal-sarp.ts and sade-sati.ts), no special purchase-
 * time input (reuses birthProfileId like mangal-dosha/gemstone).
 */
async function generateKaalSarpSadeSatiReportContent(userId: string, templateName: string, birthProfileId: string | null) {
  const [profile, user] = await Promise.all([
    birthProfileId ? prisma.birthProfile.findFirst({ where: { id: birthProfileId, userId } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const locale = (user?.locale ?? "en") as AppLocale;
  const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };

  const failed = (reason: string) => ({
    templateCode: "kaal_sarp_sade_sati_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: false,
    body: reason,
  });

  if (!profile || profile.latitude == null || profile.longitude == null) {
    return failed("This report needs your real birth profile with a known birth place to determine your real chart. Please contact support — you will not be charged for a report that didn't generate.");
  }

  const calc = await getOrComputeKundliCalculation(profile);
  if (!calc.moonSign || !calc.planetaryPositions) {
    return failed("We could not determine your real chart for this report. Please contact support — you will not be charged for a report that didn't generate.");
  }

  const planetaryPositions = calc.planetaryPositions as unknown as { planet: string; sign: ZodiacSign; degree: number; house: number | null }[];
  const kaalSarp = getRealKaalSarpDosha(planetaryPositions);
  const sadeSati = await getRealSadeSatiStatus(calc.moonSign, profile.latitude, profile.longitude);
  const remedies = [...KAAL_SARP_REMEDIES, ...SADE_SATI_REMEDIES];

  const kaalSarpText = kaalSarp.hasDosha
    ? `Present, type ${kaalSarp.type}${kaalSarp.namedType ? ` (${kaalSarp.namedType} Kaal Sarp Dosha)` : ""}.`
    : "Not present in this chart.";
  const sadeSatiText = sadeSati.isActive
    ? `Currently active, phase: ${sadeSati.phase} (Saturn is transiting the real sign ${sadeSati.saturnTransitSign}, relative to the real natal Moon sign ${sadeSati.moonSign}).`
    : `Not currently active (Saturn is transiting ${sadeSati.saturnTransitSign ?? "an undetermined sign"}, relative to the real natal Moon sign ${sadeSati.moonSign}).`;

  const reply = await generateAstrologyReply({
    userId,
    locale,
    history: [],
    userMessage: `Here are the real, already-determined facts for this person's real chart — never question, recalculate, or change any of them, only explain and give calm context around them. Write entirely in ${langName[locale]}.

Kaal Sarp Dosha: ${kaalSarpText}
Sade Sati: ${sadeSatiText}
Real traditional remedies (for both, general reference): ${remedies.join(" ")}

This is a PAID, in-depth "${templateName}" — it must read as substantial and genuinely valuable, clearly deeper than a free reading. Structure it as:
1. An opening overview (5-6 sentences) on both real results above, calm and without alarm.
2. A section (5-7 sentences) on the real Kaal Sarp Dosha result, what it traditionally means, and what its real type/named form (if present) traditionally represents.
3. A section (5-7 sentences) on the real Sade Sati result — if active, frame its current real phase as a period of discipline and growth, not disaster; if not active, reassuringly say so.
4. A section (5-7 sentences) introducing the real remedies given above as optional reference information for both — explicitly note they are not a requirement, and that a knowledgeable priest/astrologer should be consulted before undertaking any of them.
5. A closing reflection (4-5 sentences).

Hard rules: never use fear tactics or present either result as certain misfortune. Never instruct spending money on any remedy. Never give medical, legal, or financial advice.`,
    feature: "report",
    maxTokens: 7000,
  });

  return {
    templateCode: "kaal_sarp_sade_sati_report",
    templateName,
    generatedAt: new Date().toISOString(),
    birthDataUsed: true,
    body: reply.text,
  };
}
