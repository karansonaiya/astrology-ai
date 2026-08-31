import type { AppLocale } from "@/lib/i18n/config";

/**
 * Plain-language kundli interpretation content — a static, curated
 * lookup/template system, NOT AI-generated. Deliberate choice: this is
 * traditional Vedic house/planet signification knowledge (well-established,
 * doesn't vary chart to chart), so a static table is more reliable, free,
 * instant, and immune to AI rate-limits/hallucination than calling the AI
 * provider per page view would be. Mirrors the existing ZODIAC_LABELS
 * pattern in src/lib/zodiac.ts (per-locale lookup table, not i18n JSON,
 * since this is domain content rather than short UI strings).
 */

type L = Record<AppLocale, string>;

export const PLANET_LABELS: Record<string, L> = {
  Sun: { en: "Sun", hi: "सूर्य", gu: "સૂર્ય" },
  Moon: { en: "Moon", hi: "चंद्र", gu: "ચંદ્ર" },
  Mercury: { en: "Mercury", hi: "बुध", gu: "બુધ" },
  Venus: { en: "Venus", hi: "शुक्र", gu: "શુક્ર" },
  Mars: { en: "Mars", hi: "मंगल", gu: "મંગળ" },
  Jupiter: { en: "Jupiter", hi: "गुरु", gu: "ગુરુ" },
  Saturn: { en: "Saturn", hi: "शनि", gu: "શનિ" },
  Rahu: { en: "Rahu", hi: "राहु", gu: "રાહુ" },
  Ketu: { en: "Ketu", hi: "केतु", gu: "કેતુ" },
};

const PLANET_THEMES: Record<string, L> = {
  Sun: { en: "identity, vitality, and authority", hi: "पहचान, जीवनशक्ति और अधिकार", gu: "ઓળખ, જીવનશક્તિ અને સત્તા" },
  Moon: { en: "mind, emotions, and nurturing", hi: "मन, भावनाएं और पालन-पोषण", gu: "મન, લાગણીઓ અને સંભાળ" },
  Mercury: { en: "intellect, communication, and analysis", hi: "बुद्धि, संचार और विश्लेषण", gu: "બુદ્ધિ, સંચાર અને વિશ્લેષણ" },
  Venus: { en: "love, beauty, and relationships", hi: "प्रेम, सौंदर्य और रिश्ते", gu: "પ્રેમ, સૌંદર્ય અને સંબંધો" },
  Mars: { en: "energy, courage, and drive", hi: "ऊर्जा, साहस और जोश", gu: "ઊર્જા, હિંમત અને જુસ્સો" },
  Jupiter: { en: "wisdom, growth, and good fortune", hi: "ज्ञान, विकास और सौभाग्य", gu: "જ્ઞાન, વિકાસ અને સદ્ભાગ્ય" },
  Saturn: {
    en: "discipline, responsibility, and hard-earned success",
    hi: "अनुशासन, जिम्मेदारी और परिश्रम से मिली सफलता",
    gu: "શિસ્ત, જવાબદારી અને મહેનતથી મળતી સફળતા",
  },
  Rahu: {
    en: "ambition, desire, and unconventional paths",
    hi: "महत्वाकांक्षा, इच्छा और अपरंपरागत राहें",
    gu: "મહત્વાકાંક્ષા, ઇચ્છા અને બિનપરંપરાગત માર્ગો",
  },
  Ketu: {
    en: "detachment, intuition, and spiritual insight",
    hi: "वैराग्य, अंतर्ज्ञान और आध्यात्मिक सूझ",
    gu: "વૈરાગ્ય, અંતઃપ્રેરણા અને આધ્યાત્મિક સૂઝ",
  },
};

export const HOUSE_THEMES: Record<number, L> = {
  1: { en: "self, personality, and physical appearance", hi: "स्वयं, व्यक्तित्व और शारीरिक रूप", gu: "સ્વયં, વ્યક્તિત્વ અને શારીરિક દેખાવ" },
  2: { en: "wealth, family, and speech", hi: "धन, परिवार और वाणी", gu: "ધન, પરિવાર અને વાણી" },
  3: { en: "courage, siblings, and communication", hi: "साहस, भाई-बहन और संचार", gu: "હિંમત, ભાઈ-બહેન અને સંચાર" },
  4: { en: "home, mother, and emotional foundation", hi: "घर, माता और भावनात्मक आधार", gu: "ઘર, માતા અને ભાવનાત્મક પાયો" },
  5: { en: "children, creativity, and romance", hi: "संतान, रचनात्मकता और प्रेम", gu: "સંતાન, સર્જનાત્મકતા અને પ્રેમ" },
  6: { en: "health, daily work, and obstacles", hi: "स्वास्थ्य, दैनिक कार्य और बाधाएं", gu: "આરોગ્ય, રોજિંદુ કામ અને અડચણો" },
  7: { en: "marriage and partnerships", hi: "विवाह और साझेदारी", gu: "લગ્ન અને ભાગીદારી" },
  8: {
    en: "transformation, longevity, and hidden matters",
    hi: "परिवर्तन, दीर्घायु और छिपे मामले",
    gu: "પરિવર્તન, દીર્ઘાયુ અને છુપાયેલી બાબતો",
  },
  9: { en: "luck, higher learning, and father", hi: "भाग्य, उच्च शिक्षा और पिता", gu: "ભાગ્ય, ઉચ્ચ શિક્ષણ અને પિતા" },
  10: {
    en: "career, public reputation, and life purpose",
    hi: "करियर, सार्वजनिक प्रतिष्ठा और जीवन-उद्देश्य",
    gu: "કારકિર્દી, જાહેર પ્રતિષ્ઠા અને જીવન-હેતુ",
  },
  11: { en: "gains, friendships, and hopes", hi: "लाभ, मित्रता और आशाएं", gu: "લાભ, મિત્રતા અને આશાઓ" },
  12: {
    en: "losses, spirituality, and foreign connections",
    hi: "हानि, आध्यात्म और विदेश संबंध",
    gu: "નુકસાન, આધ્યાત્મિકતા અને વિદેશ સંબંધો",
  },
};

export const CORE_EXPLANATIONS: Record<"sunSign" | "moonSign" | "ascendant" | "nakshatra", L> = {
  sunSign: {
    en: "Your Sun sign reflects your core identity and sense of self — your ego, willpower, and how you express your fundamental personality.",
    hi: "आपकी सूर्य राशि आपकी मूल पहचान और आत्म-भाव को दर्शाती है — आपका अहंकार, इच्छाशक्ति, और आप अपने मूल स्वभाव को कैसे व्यक्त करते हैं।",
    gu: "તમારી સૂર્ય રાશિ તમારી મૂળ ઓળખ અને સ્વ-ભાવ દર્શાવે છે — તમારો અહંકાર, ઇચ્છાશક્તિ, અને તમે તમારા મૂળ સ્વભાવને કેવી રીતે વ્યક્ત કરો છો.",
  },
  moonSign: {
    en: "Your Moon sign reflects your inner emotional world — how you feel, react, and find comfort. In Vedic astrology, the Moon is often considered even more personally significant than the Sun.",
    hi: "आपकी चंद्र राशि आपके आंतरिक भावनात्मक संसार को दर्शाती है — आप कैसा महसूस करते हैं, प्रतिक्रिया देते हैं, और सुकून कहाँ पाते हैं। वैदिक ज्योतिष में चंद्रमा को अक्सर सूर्य से भी अधिक व्यक्तिगत रूप से महत्वपूर्ण माना जाता है।",
    gu: "તમારી ચંદ્ર રાશિ તમારી આંતરિક ભાવનાત્મક દુનિયા દર્શાવે છે — તમે કેવું અનુભવો છો, પ્રતિક્રિયા આપો છો, અને ક્યાં શાંતિ મેળવો છો. વૈદિક જ્યોતિષમાં ચંદ્રને ઘણીવાર સૂર્ય કરતાં પણ વધુ વ્યક્તિગત રીતે મહત્વનો ગણવામાં આવે છે.",
  },
  ascendant: {
    en: "Your Ascendant is the sign that was rising on the eastern horizon at your birth — it shapes your outward personality and how others perceive you. All 12 houses of your chart are counted from here, making it the most important reference point in your kundli.",
    hi: "आपका लग्न वह राशि है जो आपके जन्म के समय पूर्वी क्षितिज पर उदय हो रही थी — यह आपके बाहरी व्यक्तित्व और दूसरे लोग आपको कैसे देखते हैं, इसे आकार देता है। आपकी कुंडली के सभी 12 भाव यहीं से गिने जाते हैं, इसलिए यह आपकी कुंडली का सबसे महत्वपूर्ण संदर्भ बिंदु है।",
    gu: "તમારું લગ્ન એ રાશિ છે જે તમારા જન્મ સમયે પૂર્વ ક્ષિતિજ પર ઉદય પામી રહી હતી — તે તમારા બાહ્ય વ્યક્તિત્વ અને બીજા લોકો તમને કેવી રીતે જુએ છે તેને આકાર આપે છે. તમારી કુંડળીના બધા 12 ભાવ અહીંથી જ ગણાય છે, એટલે આ તમારી કુંડળીનું સૌથી મહત્વનું સંદર્ભ બિંદુ છે.",
  },
  nakshatra: {
    en: "Your Nakshatra is one of 27 lunar mansions the Moon was passing through at your birth — a more fine-grained layer of personality detail than your Moon sign, and especially important for marriage matching (kundli milan).",
    hi: "आपका नक्षत्र उन 27 चंद्र नक्षत्रों में से एक है जिससे चंद्रमा आपके जन्म के समय गुजर रहा था — यह आपकी चंद्र राशि से भी अधिक बारीक व्यक्तित्व विवरण देता है, और विवाह मिलान (कुंडली मिलान) के लिए विशेष रूप से महत्वपूर्ण है।",
    gu: "તમારું નક્ષત્ર એ 27 ચંદ્ર નક્ષત્રોમાંથી એક છે જેમાંથી ચંદ્ર તમારા જન્મ સમયે પસાર થઈ રહ્યો હતો — તે તમારી ચંદ્ર રાશિ કરતાં પણ વધુ ઝીણવટભરી વ્યક્તિત્વ વિગત આપે છે, અને લગ્ન મેળાપ (કુંડળી મિલાન) માટે ખાસ મહત્વનું છે.",
  },
};

const ORDINAL_EN: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
function ordinalHouse(house: number, locale: AppLocale): string {
  if (locale === "hi") return `${house}वें भाव`;
  if (locale === "gu") return `${house} ભાવ`;
  return `${ORDINAL_EN[house] ?? `${house}th`} house`;
}

/** One combined, readable sentence for a single planet placement. Falls back to a sign-only sentence when the house is unknown (birth time not given). */
export function buildPlanetInterpretation(planetName: string, house: number | null, locale: AppLocale): string {
  const planetTheme = PLANET_THEMES[planetName]?.[locale] ?? planetName;
  const planetLabel = PLANET_LABELS[planetName]?.[locale] ?? planetName;

  if (house == null) {
    const templates: L = {
      en: `${planetLabel} — the significator of ${planetTheme}.`,
      hi: `${planetLabel} — जो ${planetTheme} का कारक है।`,
      gu: `${planetLabel} — જે ${planetTheme} નું કારક છે.`,
    };
    return templates[locale];
  }

  const houseTheme = HOUSE_THEMES[house]?.[locale] ?? `house ${house}`;
  const templates: L = {
    en: `${planetLabel} — the significator of ${planetTheme} — sits in your ${ordinalHouse(house, locale)}, which governs ${houseTheme}.`,
    hi: `${planetLabel} — जो ${planetTheme} का कारक है — आपके ${ordinalHouse(house, locale)} में स्थित है, जो ${houseTheme} को दर्शाता है।`,
    gu: `${planetLabel} — જે ${planetTheme} નું કારક છે — તમારા ${ordinalHouse(house, locale)}માં છે, જે ${houseTheme} દર્શાવે છે.`,
  };
  return templates[locale];
}
