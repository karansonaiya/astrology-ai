/**
 * Demo/seed data for local development. Run with `npm run db:seed`.
 * Safe to re-run — uses upserts where practical.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { REPORT_TEMPLATES, PLANS, DEFAULT_REFERRAL_RULE } from "../src/lib/pricing/catalog";

const prisma = new PrismaClient();

const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

const LOCALES = ["en", "hi", "gu"] as const;

async function main() {
  console.log("Seeding report templates…");
  for (const t of REPORT_TEMPLATES) {
    await prisma.reportTemplate.upsert({ where: { code: t.code }, update: t, create: t });
  }

  console.log("Seeding plans…");
  for (const p of PLANS) {
    await prisma.plan.upsert({ where: { code: p.code }, update: p, create: p });
  }

  console.log("Seeding referral rule…");
  await prisma.referralRule.upsert({
    where: { key: "default" },
    update: DEFAULT_REFERRAL_RULE,
    create: DEFAULT_REFERRAL_RULE,
  });

  console.log("Seeding feature flags…");
  await prisma.featureFlag.upsert({
    where: { key: "maintenance_mode" },
    update: {},
    create: { key: "maintenance_mode", enabled: false, description: "Show maintenance banner and block new AI requests." },
  });
  await prisma.featureFlag.upsert({
    where: { key: "referrals_enabled" },
    update: {},
    create: { key: "referrals_enabled", enabled: true, description: "Enable the referral & rewards program." },
  });
  await prisma.featureFlag.upsert({
    where: { key: "report_store_enabled" },
    update: {},
    create: { key: "report_store_enabled", enabled: true, description: "Enable the paid report store." },
  });

  console.log("Seeding demo admin + demo user…");
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@jyoti.ai" },
    update: {},
    create: {
      email: "admin@jyoti.ai",
      name: "Jyoti AI Admin",
      passwordHash: adminPasswordHash,
      role: "admin",
      emailVerified: new Date(),
      ageConfirmed: true,
      onboardingCompletedAt: new Date(),
    },
  });
  await prisma.creditWallet.upsert({ where: { userId: admin.id }, update: {}, create: { userId: admin.id, balance: 100 } });

  const demoPasswordHash = await bcrypt.hash("Demo@12345", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@jyoti.ai" },
    update: {},
    create: {
      email: "demo@jyoti.ai",
      name: "Demo User",
      passwordHash: demoPasswordHash,
      role: "user",
      locale: "en",
      emailVerified: new Date(),
      ageConfirmed: true,
      onboardingCompletedAt: new Date(),
    },
  });
  await prisma.creditWallet.upsert({ where: { userId: demoUser.id }, update: {}, create: { userId: demoUser.id, balance: 10 } });

  await prisma.birthProfile.upsert({
    where: { id: `${demoUser.id}-primary` },
    update: {},
    create: {
      id: `${demoUser.id}-primary`,
      userId: demoUser.id,
      forSelf: true,
      name: "Demo User",
      gender: "prefer_not_to_say",
      birthDate: new Date("1996-05-14T00:00:00.000Z"),
      birthTimeKnown: true,
      birthTime: "14:32",
      birthCity: "Surat",
      birthCountry: "India",
      timezone: "Asia/Kolkata",
      primaryInterest: "career",
      consentSavedAt: new Date(),
    },
  });

  console.log("Seeding today's daily horoscope content (published) for all signs/locales…");
  const today = new Date();
  const periodDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const CONTENT_BY_LOCALE: Record<(typeof LOCALES)[number], Record<string, string>> = {
    en: {
      career: "A steady, practical day for career matters. Focus on finishing one task well rather than starting many.",
      love: "Small, honest conversations go further than grand gestures today.",
      money: "A good day to review your budget calmly rather than make new financial commitments.",
      wellness: "Prioritize rest — even 20 quiet minutes will help more than you expect.",
      reflection: "What is one thing you can simplify today?",
    },
    hi: {
      career: "करियर मामलों के लिए एक स्थिर, व्यावहारिक दिन। कई काम शुरू करने के बजाय एक काम अच्छे से पूरा करने पर ध्यान दें।",
      love: "आज छोटी, ईमानदार बातचीत बड़े इशारों से ज़्यादा असर करेगी।",
      money: "नई वित्तीय प्रतिबद्धताएं बनाने के बजाय शांति से अपने बजट की समीक्षा करने का अच्छा दिन है।",
      wellness: "आराम को प्राथमिकता दें — 20 शांत मिनट भी आपकी सोच से ज़्यादा मदद करेंगे।",
      reflection: "आज आप किस एक चीज़ को सरल बना सकते हैं?",
    },
    gu: {
      career: "કારકિર્દી બાબતો માટે એક સ્થિર, વ્યવહારુ દિવસ. ઘણા કામ શરૂ કરવાને બદલે એક કામ સારી રીતે પૂરું કરવા પર ધ્યાન આપો.",
      love: "આજે નાની, પ્રામાણિક વાતચીત મોટા હાવભાવ કરતાં વધુ અસર કરશે.",
      money: "નવી નાણાકીય પ્રતિબદ્ધતાઓ કરવાને બદલે શાંતિથી તમારા બજેટની સમીક્ષા કરવાનો સારો દિવસ છે.",
      wellness: "આરામને પ્રાથમિકતા આપો — 20 શાંત મિનિટ પણ તમારી ધારણા કરતાં વધુ મદદ કરશે.",
      reflection: "આજે તમે કઈ એક વસ્તુને સરળ બનાવી શકો છો?",
    },
  };

  const LUCKY_COLORS = ["Gold", "Ivory", "Emerald", "Violet", "Blue", "Rose"];

  for (const sign of ZODIAC_SIGNS) {
    for (const locale of LOCALES) {
      const c = CONTENT_BY_LOCALE[locale];
      await prisma.horoscopeContent.upsert({
        where: { zodiacSign_period_locale_periodDate: { zodiacSign: sign, period: "daily", locale, periodDate } },
        update: {},
        create: {
          zodiacSign: sign,
          period: "daily",
          locale,
          periodDate,
          career: c.career,
          love: c.love,
          money: c.money,
          wellness: c.wellness,
          luckyColor: LUCKY_COLORS[ZODIAC_SIGNS.indexOf(sign) % LUCKY_COLORS.length],
          luckyNumber: String(((ZODIAC_SIGNS.indexOf(sign) + 1) * 3) % 9 || 9),
          reflection: c.reflection,
          status: "published",
          publishedAt: new Date(),
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo admin login: admin@jyoti.ai / Admin@12345");
  console.log("Demo user login:  demo@jyoti.ai / Demo@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
