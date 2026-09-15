/**
 * Default pricing catalog — editable seed values, not permanent claims.
 * Admins can change prices via /admin/pricing, which updates the DB rows
 * these seed; this file is the source of truth only for `prisma db seed`.
 * All server-side order creation re-reads the DB, never trusts client
 * amounts.
 */

export const FREE_QUESTIONS_CAP = 3;

export const CREDIT_PACKS = [{ code: "pack_10", name: "10 AI Question Pack", credits: 10, priceInPaise: 4900 }];

export const REPORT_TEMPLATES = [
  {
    code: "basic_birth_insight",
    name: "Basic Birth Insight",
    description: "A foundational AI-generated reflection on your sun sign, moon sign, and general life themes.",
    priceInPaise: 7900,
  },
  {
    code: "career_business_report",
    name: "Career Direction Report",
    description: "A deeper look at career and business direction, timing themes, and reflective next steps.",
    priceInPaise: 9900,
  },
  {
    code: "compatibility_report",
    name: "Marriage Compatibility Report",
    description: "A detailed compatibility reflection for two people covering communication and potential friction points.",
    priceInPaise: 14900,
  },
  {
    code: "relationship_reflection_report",
    name: "Relationship Reflection Report",
    description: "Supportive, respectful reflection on a current relationship question.",
    priceInPaise: 9900,
  },
  {
    code: "year_ahead_report",
    name: "Year Ahead Reflection Report",
    description: "A broader reflective outlook across career, relationships, and wellbeing for the year ahead.",
    priceInPaise: 24900,
  },
  // Palm (hast rekha) photo-driven reports — the only REPORT_TEMPLATES that
  // require an uploaded photo instead of (or, for the combined one, in
  // addition to) a birth profile. See create-order/route.ts (requires a
  // photo for these codes) and entitlement.ts's generatePalmReportContent
  // (the actual vision-grounded generation, branched off these codes).
  // Prices are the founder-approved figure minus ₹10 off each originally
  // proposed tier.
  {
    code: "palm_career_report",
    name: "Career Palm Report",
    description: "An in-depth palmistry reading focused on career direction, decision-making style, and professional strengths visible in your real palm photo.",
    priceInPaise: 8900,
  },
  {
    code: "palm_love_marriage_report",
    name: "Love & Marriage Palm Report",
    description: "A detailed palmistry reading on love, relationships, and marriage indicators visible in your real palm photo.",
    priceInPaise: 13900,
  },
  {
    code: "palm_full_report",
    name: "Full Palm Report",
    description: "A comprehensive palmistry reading covering every major line and mount visible in your real palm photo.",
    priceInPaise: 23900,
  },
  {
    code: "palm_kundli_combined_report",
    name: "Palm + Kundli Combined Report",
    description: "Your real palm photo and your real birth chart, read together for a single combined reflection.",
    priceInPaise: 38900,
  },
  // Numerology paid upsell — same real, deterministic numbers as the free
  // Numerology page, plus Maturity, Personal Year, and Karmic Debt numbers,
  // with a much deeper interpretation. Market check (2026-09-14): Prokerala
  // sells a comparable numerology report at Rs.499+18% GST (~Rs.589);
  // priced well below that on purpose, since the real cost to generate this
  // is a single AI text call (no paid third-party data API involved at all,
  // unlike a kundli report which needs real Prokerala credits) — margin is
  // healthy even at this price.
  {
    code: "numerology_full_report",
    name: "Full Numerology Report",
    description: "Your Maturity Number, Personal Year Number, and Karmic Debt numbers, plus a much deeper interpretation of your core numbers.",
    priceInPaise: 9900,
  },
  // Nakshatra-based baby naming upsell — real starting syllable (see
  // src/lib/naming/nakshatra-names.ts), many more names than the free
  // version, each cross-checked against real Pythagorean numerology.
  // Market check (2026-09-16): professional Nakshatra-based baby-naming
  // consultations in India run Rs.995-5000+; priced far below that on
  // purpose since the real cost to generate this is a couple of AI text
  // calls plus a birth-chart lookup this app is already making elsewhere.
  {
    code: "baby_name_full_report",
    name: "Full Baby Name Report",
    description: "30 real names starting with your baby's traditional Nakshatra syllable, each cross-checked against real numerology.",
    priceInPaise: 9900,
  },
];

// Report template codes whose fulfillment requires a real uploaded photo
// (create-order/route.ts enforces this at purchase time; entitlement.ts's
// fulfillOrder branches on it to call generatePalmReportContent instead of
// the generic birth-chart-only generateReportContent).
export const PALM_REPORT_CODES = new Set([
  "palm_career_report",
  "palm_love_marriage_report",
  "palm_full_report",
  "palm_kundli_combined_report",
]);

// Same idea as PALM_REPORT_CODES, for the numerology paid upsell — needs a
// real name + birth date captured at purchase time (see create-order/
// route.ts) instead of a photo.
export const NUMEROLOGY_REPORT_CODES = new Set(["numerology_full_report"]);

// Same idea again — needs real birth date/time/place (for the real
// Nakshatra+pada lookup) captured at purchase time.
export const BABY_NAME_REPORT_CODES = new Set(["baby_name_full_report"]);

export const PLANS = [
  {
    code: "monthly_premium",
    name: "Monthly Premium",
    description: "Higher daily question quota, priority response time, one free report credit each month, and no ads anywhere on the site.",
    priceInPaise: 14900,
    billingPeriod: "monthly",
    creditsGranted: 30,
  },
];

export const DEFAULT_REFERRAL_RULE = {
  key: "default",
  triggerEvent: "first_purchase",
  referrerReward: 20,
  referredReward: 10,
};
