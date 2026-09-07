import type { ZodiacSign } from "@/lib/zodiac";

/**
 * General, non-personalized zodiac-sign reference content for the /blog
 * section — element, ruling planet, approximate Vedic (sidereal, Lahiri
 * ayanamsa) date range, personality traits, compatibility, and traditional
 * naming syllables. This is standard, widely-published Vedic astrology
 * knowledge about the 12 rashis themselves, not a personalized chart
 * reading — it doesn't violate the "never invent real astrological
 * calculation data" rule (that rule is about NOT fabricating a specific
 * person's planetary positions; general zodiac-sign lore is the same kind
 * of catalog content as src/lib/zodiac.ts's ZODIAC_LABELS/ZODIAC_SYMBOLS).
 *
 * Date ranges use the Vedic solar calendar (sidereal), matching this app's
 * own astrology engine (Lahiri ayanamsa throughout — see
 * src/lib/astrology/adapter.ts), NOT the Western tropical zodiac dates
 * most people are casually familiar with, which run about 3-4 weeks later.
 *
 * Naming syllables (namingLetters) are the traditional starting sounds for
 * a baby's name based on birth nakshatra/rashi — commonly published across
 * Vedic naming guides. Presented as a simplified representative set (the
 * fully detailed version varies by pada across sources and isn't something
 * to publish without a fully reliable primary reference); phonetic
 * syllables, so kept the same across all 3 locales rather than translated.
 */

type Locale = "en" | "hi" | "gu";

export type ZodiacProfile = {
  sign: ZodiacSign;
  element: Record<Locale, string>;
  rulingPlanet: Record<Locale, string>;
  dateRange: string;
  luckyColor: Record<Locale, string>;
  luckyNumber: string;
  namingLetters: string;
  traits: Record<Locale, string>;
  compatibleWith: ZodiacSign[];
};

export const ZODIAC_PROFILES: Record<ZodiacSign, ZodiacProfile> = {
  aries: {
    sign: "aries",
    element: { en: "Fire", hi: "अग्नि", gu: "અગ્નિ" },
    rulingPlanet: { en: "Mars", hi: "मंगल", gu: "મંગળ" },
    dateRange: "Apr 14 – May 14",
    luckyColor: { en: "Red", hi: "लाल", gu: "લાલ" },
    luckyNumber: "9",
    namingLetters: "Chu, Che, Cho, La, A",
    traits: {
      en: "Mesha is the first rashi, ruled by Mars, and carries a fire element that shows up as initiative, directness, and a willingness to act first and think later. People with a strong Aries influence are often described as energetic and quick to start new things, though they can also be impatient. This is a general archetype, not a description of any one person's actual chart.",
      hi: "मेष पहली राशि है, इसके स्वामी मंगल हैं, और अग्नि तत्व इसमें पहल, स्पष्टवादिता, और पहले काम करके बाद में सोचने की प्रवृत्ति के रूप में दिखता है। जिन लोगों पर मेष का प्रभाव अधिक होता है, वे अक्सर ऊर्जावान और नई चीज़ें जल्दी शुरू करने वाले माने जाते हैं, हालांकि वे अधीर भी हो सकते हैं। यह एक सामान्य प्रतिरूप है, किसी एक व्यक्ति की असली कुंडली का विवरण नहीं।",
      gu: "મેષ પહેલી રાશિ છે, તેના સ્વામી મંગળ છે, અને અગ્નિ તત્વ તેમાં પહેલ, સ્પષ્ટવાદિતા, અને પહેલા કામ કરીને પછી વિચારવાની વૃત્તિ તરીકે દેખાય છે. જે લોકો પર મેષનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર ઊર્જાવાન અને નવી વસ્તુઓ ઝડપથી શરૂ કરનારા ગણાય છે, જોકે તેઓ અધીરા પણ હોઈ શકે છે. આ એક સામાન્ય પ્રતિરૂપ છે, કોઈ એક વ્યક્તિની ખરી કુંડળીનું વર્ણન નથી.",
    },
    compatibleWith: ["leo", "sagittarius", "gemini"],
  },
  taurus: {
    sign: "taurus",
    element: { en: "Earth", hi: "पृथ्वी", gu: "પૃથ્વી" },
    rulingPlanet: { en: "Venus", hi: "शुक्र", gu: "શુક્ર" },
    dateRange: "May 15 – Jun 14",
    luckyColor: { en: "Green", hi: "हरा", gu: "લીલો" },
    luckyNumber: "6",
    namingLetters: "E, U, A, O, Va, Vi, Vu, Ve, Vo",
    traits: {
      en: "Vrishabha is an earth sign ruled by Venus, associated with steadiness, patience, and a strong appreciation for comfort, beauty, and security. Those with a strong Taurus influence are generally described as reliable and calm under pressure, sometimes at the cost of being slow to change course once they've settled on a direction.",
      hi: "वृषभ पृथ्वी तत्व की राशि है, इसके स्वामी शुक्र हैं, और यह स्थिरता, धैर्य, तथा आराम, सुंदरता और सुरक्षा के प्रति गहरी पसंद से जुड़ी है। जिन पर वृषभ का प्रभाव अधिक होता है, वे आमतौर पर भरोसेमंद और दबाव में शांत माने जाते हैं, हालांकि एक बार दिशा तय करने के बाद बदलाव में धीमे भी हो सकते हैं।",
      gu: "વૃષભ પૃથ્વી તત્વની રાશિ છે, તેના સ્વામી શુક્ર છે, અને તે સ્થિરતા, ધીરજ, તથા આરામ, સુંદરતા અને સલામતી પ્રત્યેની ઊંડી પસંદગી સાથે જોડાયેલી છે. જેમના પર વૃષભનો પ્રભાવ વધુ હોય છે, તેઓ સામાન્ય રીતે ભરોસાપાત્ર અને દબાણમાં શાંત ગણાય છે, જોકે એક વાર દિશા નક્કી કર્યા પછી બદલાવમાં ધીમા પણ હોઈ શકે છે.",
    },
    compatibleWith: ["virgo", "capricorn", "cancer"],
  },
  gemini: {
    sign: "gemini",
    element: { en: "Air", hi: "वायु", gu: "વાયુ" },
    rulingPlanet: { en: "Mercury", hi: "बुध", gu: "બુધ" },
    dateRange: "Jun 15 – Jul 15",
    luckyColor: { en: "Yellow", hi: "पीला", gu: "પીળો" },
    luckyNumber: "5",
    namingLetters: "Ka, Ki, Ku, Gha, Cha, Ke, Ko, Ha",
    traits: {
      en: "Mithuna is an air sign ruled by Mercury, linked to curiosity, quick thinking, and comfort with communication in many forms. People with a strong Gemini influence are often described as adaptable and conversational, able to hold several interests at once, though they can also find it hard to commit to just one.",
      hi: "मिथुन वायु तत्व की राशि है, इसके स्वामी बुध हैं, और यह जिज्ञासा, तेज़ सोच, और कई तरह से बातचीत में सहजता से जुड़ी है। जिन पर मिथुन का प्रभाव अधिक होता है, वे अक्सर लचीले और बातूनी माने जाते हैं, एक साथ कई रुचियां रख सकते हैं, हालांकि किसी एक चीज़ पर टिके रहना उनके लिए मुश्किल हो सकता है।",
      gu: "મિથુન વાયુ તત્વની રાશિ છે, તેના સ્વામી બુધ છે, અને તે જિજ્ઞાસા, ઝડપી વિચારસરણી, અને અનેક રીતે વાતચીતમાં સહજતા સાથે જોડાયેલી છે. જેમના પર મિથુનનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર લવચીક અને વાતોડિયા ગણાય છે, એકસાથે અનેક રુચિઓ ધરાવી શકે છે, જોકે કોઈ એક વસ્તુ પર ટકી રહેવું તેમના માટે અઘરું હોઈ શકે છે.",
    },
    compatibleWith: ["libra", "aquarius", "aries"],
  },
  cancer: {
    sign: "cancer",
    element: { en: "Water", hi: "जल", gu: "જળ" },
    rulingPlanet: { en: "Moon", hi: "चंद्र", gu: "ચંદ્ર" },
    dateRange: "Jul 16 – Aug 16",
    luckyColor: { en: "White", hi: "सफ़ेद", gu: "સફેદ" },
    luckyNumber: "2",
    namingLetters: "Hi, Hu, He, Ho, Da, Di, Du, De, Do",
    traits: {
      en: "Karka is a water sign ruled by the Moon, associated with emotional sensitivity, strong attachment to home and family, and an instinct to protect the people close to them. Those with a strong Cancer influence are often described as caring and intuitive, though they can also hold on to feelings longer than most.",
      hi: "कर्क जल तत्व की राशि है, इसके स्वामी चंद्रमा हैं, और यह भावनात्मक संवेदनशीलता, घर-परिवार से गहरे जुड़ाव, तथा अपनों की रक्षा करने की सहज प्रवृत्ति से जुड़ी है। जिन पर कर्क का प्रभाव अधिक होता है, वे अक्सर देखभाल करने वाले और सहज-बोधी माने जाते हैं, हालांकि वे भावनाओं को औरों से ज़्यादा समय तक थामे रख सकते हैं।",
      gu: "કર્ક જળ તત્વની રાશિ છે, તેના સ્વામી ચંદ્ર છે, અને તે ભાવનાત્મક સંવેદનશીલતા, ઘર-પરિવાર સાથેના ઊંડા જોડાણ, તથા પોતાનાઓની રક્ષા કરવાની સહજ વૃત્તિ સાથે જોડાયેલી છે. જેમના પર કર્કનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર કાળજી રાખનારા અને સાહજિક ગણાય છે, જોકે તેઓ લાગણીઓને બીજા કરતાં વધુ સમય સુધી પકડી રાખી શકે છે.",
    },
    compatibleWith: ["scorpio", "pisces", "taurus"],
  },
  leo: {
    sign: "leo",
    element: { en: "Fire", hi: "अग्नि", gu: "અગ્નિ" },
    rulingPlanet: { en: "Sun", hi: "सूर्य", gu: "સૂર્ય" },
    dateRange: "Aug 17 – Sep 16",
    luckyColor: { en: "Gold", hi: "सुनहरा", gu: "સોનેરી" },
    luckyNumber: "1",
    namingLetters: "Ma, Mi, Mu, Me, Mo, Ta, Ti, Tu",
    traits: {
      en: "Simha is a fire sign ruled by the Sun, linked to confidence, a natural pull toward leadership, and a wish to be recognized for one's efforts. People with a strong Leo influence are often described as warm and generous with attention, though they can also want the spotlight more than others are comfortable giving.",
      hi: "सिंह अग्नि तत्व की राशि है, इसके स्वामी सूर्य हैं, और यह आत्मविश्वास, नेतृत्व की स्वाभाविक प्रवृत्ति, तथा अपने प्रयासों की पहचान चाहने की भावना से जुड़ी है। जिन पर सिंह का प्रभाव अधिक होता है, वे अक्सर गर्मजोश और उदार माने जाते हैं, हालांकि वे दूसरों की तुलना में अधिक ध्यान चाहने वाले भी हो सकते हैं।",
      gu: "સિંહ અગ્નિ તત્વની રાશિ છે, તેના સ્વામી સૂર્ય છે, અને તે આત્મવિશ્વાસ, નેતૃત્વ તરફની સ્વાભાવિક વૃત્તિ, તથા પોતાના પ્રયત્નોની ઓળખ ઇચ્છવાની ભાવના સાથે જોડાયેલી છે. જેમના પર સિંહનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર ઉષ્માભર્યા અને ઉદાર ગણાય છે, જોકે તેઓ બીજા કરતાં વધુ ધ્યાન ઇચ્છનારા પણ હોઈ શકે છે.",
    },
    compatibleWith: ["aries", "sagittarius", "gemini"],
  },
  virgo: {
    sign: "virgo",
    element: { en: "Earth", hi: "पृथ्वी", gu: "પૃથ્વી" },
    rulingPlanet: { en: "Mercury", hi: "बुध", gu: "બુધ" },
    dateRange: "Sep 17 – Oct 17",
    luckyColor: { en: "Light green", hi: "हल्का हरा", gu: "આછો લીલો" },
    luckyNumber: "5",
    namingLetters: "To, Pa, Pi, Pu, Sha, Na, Tha",
    traits: {
      en: "Kanya is an earth sign ruled by Mercury, associated with attention to detail, a practical approach to problems, and a strong sense of responsibility. Those with a strong Virgo influence are often described as reliable and organized, though they can also be harder on themselves than the situation calls for.",
      hi: "कन्या पृथ्वी तत्व की राशि है, इसके स्वामी बुध हैं, और यह बारीकियों पर ध्यान, समस्याओं के प्रति व्यावहारिक दृष्टिकोण, तथा ज़िम्मेदारी की गहरी भावना से जुड़ी है। जिन पर कन्या का प्रभाव अधिक होता है, वे अक्सर भरोसेमंद और व्यवस्थित माने जाते हैं, हालांकि वे खुद के प्रति ज़रूरत से ज़्यादा सख्त भी हो सकते हैं।",
      gu: "કન્યા પૃથ્વી તત્વની રાશિ છે, તેના સ્વામી બુધ છે, અને તે બારીકાઈઓ પર ધ્યાન, સમસ્યાઓ પ્રત્યે વ્યવહારુ અભિગમ, તથા જવાબદારીની ઊંડી ભાવના સાથે જોડાયેલી છે. જેમના પર કન્યાનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર ભરોસાપાત્ર અને વ્યવસ્થિત ગણાય છે, જોકે તેઓ પોતાની જાત પ્રત્યે જરૂર કરતાં વધુ કડક પણ હોઈ શકે છે.",
    },
    compatibleWith: ["taurus", "capricorn", "cancer"],
  },
  libra: {
    sign: "libra",
    element: { en: "Air", hi: "वायु", gu: "વાયુ" },
    rulingPlanet: { en: "Venus", hi: "शुक्र", gu: "શુક્ર" },
    dateRange: "Oct 18 – Nov 16",
    luckyColor: { en: "Light blue", hi: "हल्का नीला", gu: "આછો ભૂરો" },
    luckyNumber: "6",
    namingLetters: "Ra, Ri, Ru, Re, Ro, Ta, Ti, Tu",
    traits: {
      en: "Tula is an air sign ruled by Venus, linked to a strong sense of fairness, a preference for harmony over conflict, and a genuine appreciation for balance in relationships. People with a strong Libra influence are often described as diplomatic and easy to get along with, though they can also find it hard to make a decision when it might upset someone.",
      hi: "तुला वायु तत्व की राशि है, इसके स्वामी शुक्र हैं, और यह निष्पक्षता की गहरी भावना, टकराव के बजाय सामंजस्य को प्राथमिकता देने, तथा रिश्तों में संतुलन की सच्ची कद्र से जुड़ी है। जिन पर तुला का प्रभाव अधिक होता है, वे अक्सर कूटनीतिक और मिलनसार माने जाते हैं, हालांकि जब फैसला किसी को नाराज़ कर सकता हो तो उन्हें निर्णय लेना मुश्किल लग सकता है।",
      gu: "તુલા વાયુ તત્વની રાશિ છે, તેના સ્વામી શુક્ર છે, અને તે નિષ્પક્ષતાની ઊંડી ભાવના, ટકરાવને બદલે સંવાદિતાને પ્રાધાન્ય આપવાની વૃત્તિ, તથા સંબંધોમાં સંતુલનની સાચી કદર સાથે જોડાયેલી છે. જેમના પર તુલાનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર કૂટનીતિક અને મળતાવડા ગણાય છે, જોકે જ્યારે નિર્ણય કોઈને નારાજ કરી શકે ત્યારે તેમને નિર્ણય લેવો અઘરો લાગી શકે છે.",
    },
    compatibleWith: ["gemini", "aquarius", "leo"],
  },
  scorpio: {
    sign: "scorpio",
    element: { en: "Water", hi: "जल", gu: "જળ" },
    rulingPlanet: { en: "Mars", hi: "मंगल", gu: "મંગળ" },
    dateRange: "Nov 17 – Dec 15",
    luckyColor: { en: "Maroon", hi: "गहरा लाल", gu: "ઘેરો લાલ" },
    luckyNumber: "9",
    namingLetters: "To, Na, Ni, Nu, Ne, No, Ya, Yi",
    traits: {
      en: "Vrishchika is a water sign ruled by Mars, associated with intensity, determination, and a preference for depth over small talk. Those with a strong Scorpio influence are often described as focused and loyal once they trust someone, though they can also hold their guard up longer than most before letting people in.",
      hi: "वृश्चिक जल तत्व की राशि है, इसके स्वामी मंगल हैं, और यह तीव्रता, दृढ़ संकल्प, तथा सतही बातों की बजाय गहराई की पसंद से जुड़ी है। जिन पर वृश्चिक का प्रभाव अधिक होता है, वे किसी पर भरोसा करने के बाद केंद्रित और वफ़ादार माने जाते हैं, हालांकि वे दूसरों की तुलना में अपनी सुरक्षा-दीवार लंबे समय तक बनाए रख सकते हैं।",
      gu: "વૃશ્ચિક જળ તત્વની રાશિ છે, તેના સ્વામી મંગળ છે, અને તે તીવ્રતા, દ્રઢ સંકલ્પ, તથા સપાટી પરની વાતોને બદલે ઊંડાણની પસંદગી સાથે જોડાયેલી છે. જેમના પર વૃશ્ચિકનો પ્રભાવ વધુ હોય છે, તેઓ કોઈના પર ભરોસો કર્યા પછી કેન્દ્રિત અને વફાદાર ગણાય છે, જોકે તેઓ બીજા કરતાં પોતાની સુરક્ષા-દીવાલ લાંબા સમય સુધી જાળવી શકે છે.",
    },
    compatibleWith: ["cancer", "pisces", "virgo"],
  },
  sagittarius: {
    sign: "sagittarius",
    element: { en: "Fire", hi: "अग्नि", gu: "અગ્નિ" },
    rulingPlanet: { en: "Jupiter", hi: "बृहस्पति", gu: "ગુરુ" },
    dateRange: "Dec 16 – Jan 14",
    luckyColor: { en: "Yellow", hi: "पीला", gu: "પીળો" },
    luckyNumber: "3",
    namingLetters: "Ye, Yo, Bha, Bhu, Dha, Pha, Da, Bhe",
    traits: {
      en: "Dhanu is a fire sign ruled by Jupiter, linked to optimism, a love of learning, and a restless pull toward new places and ideas. People with a strong Sagittarius influence are often described as honest and good-humoured, though they can also speak their mind more bluntly than the moment calls for.",
      hi: "धनु अग्नि तत्व की राशि है, इसके स्वामी बृहस्पति हैं, और यह आशावाद, सीखने के प्रति प्रेम, तथा नई जगहों और विचारों की ओर बेचैन खिंचाव से जुड़ी है। जिन पर धनु का प्रभाव अधिक होता है, वे अक्सर ईमानदार और खुशमिज़ाज माने जाते हैं, हालांकि वे कभी-कभी ज़रूरत से ज़्यादा साफ़गोई से अपनी बात कह देते हैं।",
      gu: "ધનુ અગ્નિ તત્વની રાશિ છે, તેના સ્વામી ગુરુ છે, અને તે આશાવાદ, શીખવા પ્રત્યેનો પ્રેમ, તથા નવી જગ્યાઓ અને વિચારો તરફના બેચેન ખેંચાણ સાથે જોડાયેલી છે. જેમના પર ધનુનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર પ્રામાણિક અને ખુશમિજાજ ગણાય છે, જોકે તેઓ ક્યારેક જરૂર કરતાં વધુ સ્પષ્ટપણે પોતાની વાત કહી દે છે.",
    },
    compatibleWith: ["aries", "leo", "libra"],
  },
  capricorn: {
    sign: "capricorn",
    element: { en: "Earth", hi: "पृथ्वी", gu: "પૃથ્વી" },
    rulingPlanet: { en: "Saturn", hi: "शनि", gu: "શનિ" },
    dateRange: "Jan 15 – Feb 12",
    luckyColor: { en: "Dark brown", hi: "गहरा भूरा", gu: "ઘેરો ભૂરો" },
    luckyNumber: "8",
    namingLetters: "Bho, Ja, Ji, Khi, Khu, Kha, Ga, Gi",
    traits: {
      en: "Makara is an earth sign ruled by Saturn, associated with discipline, patience, and a long-term view toward goals. Those with a strong Capricorn influence are often described as dependable and hard-working, though they can also find it difficult to relax or celebrate progress along the way.",
      hi: "मकर पृथ्वी तत्व की राशि है, इसके स्वामी शनि हैं, और यह अनुशासन, धैर्य, तथा लक्ष्यों के प्रति दीर्घकालिक दृष्टिकोण से जुड़ी है। जिन पर मकर का प्रभाव अधिक होता है, वे अक्सर भरोसेमंद और मेहनती माने जाते हैं, हालांकि उनके लिए रास्ते में आराम करना या प्रगति का जश्न मनाना मुश्किल हो सकता है।",
      gu: "મકર પૃથ્વી તત્વની રાશિ છે, તેના સ્વામી શનિ છે, અને તે અનુશાસન, ધીરજ, તથા લક્ષ્યો પ્રત્યેના લાંબા ગાળાના દૃષ્ટિકોણ સાથે જોડાયેલી છે. જેમના પર મકરનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર ભરોસાપાત્ર અને મહેનતુ ગણાય છે, જોકે તેમના માટે રસ્તામાં આરામ કરવો કે પ્રગતિની ઉજવણી કરવી અઘરું હોઈ શકે છે.",
    },
    compatibleWith: ["taurus", "virgo", "scorpio"],
  },
  aquarius: {
    sign: "aquarius",
    element: { en: "Air", hi: "वायु", gu: "વાયુ" },
    rulingPlanet: { en: "Saturn", hi: "शनि", gu: "શનિ" },
    dateRange: "Feb 13 – Mar 14",
    luckyColor: { en: "Electric blue", hi: "चमकीला नीला", gu: "તેજ ભૂરો" },
    luckyNumber: "4",
    namingLetters: "Ga, Gi, Gu, Ge, Go, Sa, Si, Su",
    traits: {
      en: "Kumbha is an air sign traditionally ruled by Saturn, linked to independent thinking, a strong sense of fairness for groups and communities, and comfort standing apart from the crowd. People with a strong Aquarius influence are often described as original and principled, though they can also come across as detached from feelings in the moment.",
      hi: "कुंभ वायु तत्व की राशि है, इसके पारंपरिक स्वामी शनि हैं, और यह स्वतंत्र सोच, समूहों तथा समुदाय के प्रति निष्पक्षता की गहरी भावना, तथा भीड़ से अलग खड़े होने में सहजता से जुड़ी है। जिन पर कुंभ का प्रभाव अधिक होता है, वे अक्सर मौलिक और सिद्धांतवादी माने जाते हैं, हालांकि वे कभी-कभी उस पल की भावनाओं से कटे हुए भी लग सकते हैं।",
      gu: "કુંભ વાયુ તત્વની રાશિ છે, તેના પરંપરાગત સ્વામી શનિ છે, અને તે સ્વતંત્ર વિચારસરણી, જૂથો તથા સમુદાય પ્રત્યે નિષ્પક્ષતાની ઊંડી ભાવના, તથા ભીડથી અલગ ઊભા રહેવામાં સહજતા સાથે જોડાયેલી છે. જેમના પર કુંભનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર મૌલિક અને સિદ્ધાંતવાદી ગણાય છે, જોકે તેઓ ક્યારેક તે ક્ષણની લાગણીઓથી અલિપ્ત પણ લાગી શકે છે.",
    },
    compatibleWith: ["gemini", "libra", "sagittarius"],
  },
  pisces: {
    sign: "pisces",
    element: { en: "Water", hi: "जल", gu: "જળ" },
    rulingPlanet: { en: "Jupiter", hi: "बृहस्पति", gu: "ગુરુ" },
    dateRange: "Mar 15 – Apr 13",
    luckyColor: { en: "Sea green", hi: "समुद्री हरा", gu: "દરિયાઈ લીલો" },
    luckyNumber: "7",
    namingLetters: "Di, Du, Tha, Jha, De, Do, Cha, Chi",
    traits: {
      en: "Meena is a water sign ruled by Jupiter, associated with imagination, empathy, and a strong pull toward creative or spiritual reflection. Those with a strong Pisces influence are often described as compassionate and intuitive, though they can also find it hard to set firm boundaries with people they care about.",
      hi: "मीन जल तत्व की राशि है, इसके स्वामी बृहस्पति हैं, और यह कल्पनाशीलता, सहानुभूति, तथा रचनात्मक या आध्यात्मिक चिंतन की ओर गहरे रुझान से जुड़ी है। जिन पर मीन का प्रभाव अधिक होता है, वे अक्सर दयालु और सहज-बोधी माने जाते हैं, हालांकि जिन्हें वे चाहते हैं उनके साथ सीमाएं तय करना उनके लिए मुश्किल हो सकता है।",
      gu: "મીન જળ તત્વની રાશિ છે, તેના સ્વામી ગુરુ છે, અને તે કલ્પનાશીલતા, સહાનુભૂતિ, તથા સર્જનાત્મક કે આધ્યાત્મિક ચિંતન તરફના ઊંડા વલણ સાથે જોડાયેલી છે. જેમના પર મીનનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર દયાળુ અને સાહજિક ગણાય છે, જોકે જેમને તેઓ ચાહે છે તેમની સાથે સીમાઓ નક્કી કરવી તેમના માટે અઘરું હોઈ શકે છે.",
    },
    compatibleWith: ["cancer", "scorpio", "capricorn"],
  },
};
