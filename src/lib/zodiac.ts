export const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍",
  libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

export const ZODIAC_LABELS: Record<ZodiacSign, Record<"en" | "hi" | "gu", string>> = {
  aries: { en: "Aries", hi: "मेष", gu: "મેષ" },
  taurus: { en: "Taurus", hi: "वृषभ", gu: "વૃષભ" },
  gemini: { en: "Gemini", hi: "मिथुन", gu: "મિથુન" },
  cancer: { en: "Cancer", hi: "कर्क", gu: "કર્ક" },
  leo: { en: "Leo", hi: "सिंह", gu: "સિંહ" },
  virgo: { en: "Virgo", hi: "कन्या", gu: "કન્યા" },
  libra: { en: "Libra", hi: "तुला", gu: "તુલા" },
  scorpio: { en: "Scorpio", hi: "वृश्चिक", gu: "વૃશ્ચિક" },
  sagittarius: { en: "Sagittarius", hi: "धनु", gu: "ધનુ" },
  capricorn: { en: "Capricorn", hi: "मकर", gu: "મકર" },
  aquarius: { en: "Aquarius", hi: "कुंभ", gu: "કુંભ" },
  pisces: { en: "Pisces", hi: "मीन", gu: "મીન" },
};
