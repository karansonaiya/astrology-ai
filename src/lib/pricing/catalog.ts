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
];

export const PLANS = [
  {
    code: "monthly_premium",
    name: "Monthly Premium",
    description: "Higher daily question quota, priority response time, and one free report credit each month.",
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
