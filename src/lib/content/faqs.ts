/**
 * Shared FAQ content — used by both the dedicated /faq page and the landing
 * page's inline FAQ teaser, so the two never drift out of sync. Plain
 * hardcoded per-locale strings (same "no DB table" precedent as
 * src/lib/pricing/catalog.ts and src/lib/personas/catalog.ts — this is
 * static site copy, not admin-editable content).
 *
 * Deliberately does NOT include a refund-policy question — the founder
 * removed the Refund & Cancellation Policy entirely (no refunds offered),
 * so a FAQ entry pointing at it would be stale/misleading.
 */

export type Faq = {
  q: Record<"en" | "hi" | "gu", string>;
  a: Record<"en" | "hi" | "gu", string>;
};

export const FAQS: Faq[] = [
  {
    q: { en: "Is this real astrology or AI-generated?", hi: "क्या यह असली ज्योतिष है या AI-जनित?", gu: "શું આ ખરું જ્યોતિષ છે કે AI-જનિત?" },
    a: {
      en: "Prerna AI provides AI-generated, astrology-style guidance for reflection, not a certain prediction. Every answer is clearly labelled.",
      hi: "Prerna AI चिंतन के लिए AI-जनित, ज्योतिष-शैली मार्गदर्शन देता है, निश्चित भविष्यवाणी नहीं। हर जवाब स्पष्ट रूप से चिह्नित है।",
      gu: "Prerna AI ચિંતન માટે AI-જનિત, જ્યોતિષ-શૈલી માર્ગદર્શન આપે છે, ખાતરીપૂર્વકની આગાહી નહીં. દરેક જવાબ સ્પષ્ટપણે દર્શાવેલ છે.",
    },
  },
  {
    q: { en: "Is my birth data safe?", hi: "क्या मेरा जन्म डेटा सुरक्षित है?", gu: "શું મારો જન્મ ડેટા સુરક્ષિત છે?" },
    a: {
      en: "Birth details are optional, stored only with consent, never sold, and can be deleted anytime from Settings.",
      hi: "जन्म जानकारी वैकल्पिक है, केवल सहमति से सेव होती है, कभी बेची नहीं जाती, और सेटिंग्स से कभी भी हटाई जा सकती है।",
      gu: "જન્મ વિગતો વૈકલ્પિક છે, ફક્ત સંમતિથી સેવ થાય છે, ક્યારેય વેચાતી નથી, અને સેટિંગ્સમાંથી ગમે ત્યારે ડિલીટ કરી શકાય છે.",
    },
  },
  {
    q: {
      en: "Can Prerna AI diagnose health, legal, or financial issues?",
      hi: "क्या Prerna AI स्वास्थ्य, कानूनी या वित्तीय मुद्दों का निदान कर सकता है?",
      gu: "શું Prerna AI આરોગ્ય, કાનૂની કે નાણાકીય મુદ્દાઓનું નિદાન કરી શકે?",
    },
    a: {
      en: "No. Prerna AI is not able to give medical, legal, or financial advice, and will always direct you to a qualified professional for these.",
      hi: "नहीं। Prerna AI चिकित्सा, कानूनी या वित्तीय सलाह नहीं दे सकता, और हमेशा आपको इसके लिए किसी योग्य विशेषज्ञ के पास भेजेगा।",
      gu: "ના. Prerna AI તબીબી, કાનૂની કે નાણાકીય સલાહ આપી શકતું નથી, અને હંમેશા તમને આ માટે યોગ્ય નિષ્ણાત પાસે મોકલશે.",
    },
  },
  {
    q: { en: "What languages are supported?", hi: "कौन सी भाषाएं समर्थित हैं?", gu: "કઈ ભાષાઓ સપોર્ટેડ છે?" },
    a: {
      en: "Gujarati, Hindi, and English are fully supported across the entire app and in every AI response.",
      hi: "गुजराती, हिंदी और अंग्रेज़ी, पूरे ऐप में और हर AI जवाब में पूरी तरह से समर्थित हैं।",
      gu: "ગુજરાતી, હિન્દી અને અંગ્રેજી, સમગ્ર એપમાં અને દરેક AI જવાબમાં સંપૂર્ણપણે સપોર્ટેડ છે.",
    },
  },
  {
    q: {
      en: "Do I need my exact birth time to use it?",
      hi: "क्या मुझे इस्तेमाल के लिए अपना सटीक जन्म समय बताना ज़रूरी है?",
      gu: "શું મારે વાપરવા માટે મારો ચોક્કસ જન્મ સમય આપવો જરૂરી છે?",
    },
    a: {
      en: "No. An exact birth time makes your chart more precise, but you can still get meaningful guidance with just your birth date, or even with no birth details at all.",
      hi: "नहीं। सटीक जन्म समय आपकी कुंडली को अधिक सटीक बनाता है, लेकिन केवल जन्म तारीख के साथ, या बिना किसी जन्म जानकारी के भी, आपको सार्थक मार्गदर्शन मिल सकता है।",
      gu: "ના. ચોક્કસ જન્મ સમય તમારી કુંડળીને વધુ ચોક્કસ બનાવે છે, પણ ફક્ત જન્મ તારીખ સાથે, અથવા કોઈ જન્મ વિગતો વગર પણ, તમને અર્થપૂર્ણ માર્ગદર્શન મળી શકે છે.",
    },
  },
  {
    q: { en: "How much does it cost? Is there a free trial?", hi: "इसकी कीमत क्या है? क्या मुफ़्त ट्रायल है?", gu: "તેની કિંમત શું છે? શું મફત ટ્રાયલ છે?" },
    a: {
      en: "Your first 3 questions are free, no card required. After that, you can buy a small credit pack or a monthly plan; full pricing is shown on the Pricing page before you pay.",
      hi: "आपके पहले 3 सवाल मुफ़्त हैं, कार्ड की ज़रूरत नहीं। इसके बाद, आप एक छोटा क्रेडिट पैक या मासिक योजना खरीद सकते हैं; भुगतान से पहले पूरी कीमत Pricing पेज पर दिखाई जाती है।",
      gu: "તમારા પહેલા 3 પ્રશ્નો મફત છે, કાર્ડની જરૂર નથી. પછી, તમે એક નાનું ક્રેડિટ પેક અથવા માસિક પ્લાન ખરીદી શકો છો; ચુકવણી પહેલાં સંપૂર્ણ ભાવ Pricing પેજ પર બતાવવામાં આવે છે.",
    },
  },
  {
    q: {
      en: "Can I try Prerna AI without creating an account?",
      hi: "क्या मैं बिना खाता बनाए Prerna AI आज़मा सकता हूं?",
      gu: "શું હું ખાતું બનાવ્યા વગર Prerna AI અજમાવી શકું?",
    },
    a: {
      en: "Yes. The homepage lets you ask one question for free with no signup. Creating a free account unlocks your 3 free questions, birth-chart-based guidance, and the daily horoscope.",
      hi: "हां। होमपेज पर आप बिना साइन अप किए एक सवाल मुफ़्त में पूछ सकते हैं। मुफ़्त खाता बनाने से आपके 3 मुफ़्त सवाल, जन्मकुंडली-आधारित मार्गदर्शन, और दैनिक राशिफल अनलॉक होते हैं।",
      gu: "હા. હોમપેજ પર તમે સાઇન અપ કર્યા વગર એક પ્રશ્ન મફતમાં પૂછી શકો છો. મફત ખાતું બનાવવાથી તમારા 3 મફત પ્રશ્નો, જન્મકુંડળી-આધારિત માર્ગદર્શન, અને દૈનિક રાશિફળ અનલૉક થાય છે.",
    },
  },
  {
    q: {
      en: "How is this different from talking to a real astrologer?",
      hi: "यह किसी असली ज्योतिषी से बात करने से कैसे अलग है?",
      gu: "આ ખરા જ્યોતિષી સાથે વાત કરવા કરતાં કેવી રીતે અલગ છે?",
    },
    a: {
      en: "Prerna AI offers quick, private, AI-generated reflection any time of day, in your own language. It's not a substitute for a professional astrologer, and it never claims certainty about real-world outcomes.",
      hi: "Prerna AI किसी भी समय, आपकी अपनी भाषा में, त्वरित और निजी AI-जनित चिंतन देता है। यह किसी पेशेवर ज्योतिषी का विकल्प नहीं है, और यह वास्तविक जीवन के परिणामों के बारे में कभी निश्चितता का दावा नहीं करता।",
      gu: "Prerna AI ગમે ત્યારે, તમારી પોતાની ભાષામાં, ઝડપી અને ખાનગી AI-જનિત ચિંતન આપે છે. આ કોઈ પ્રોફેશનલ જ્યોતિષીનો વિકલ્પ નથી, અને આ વાસ્તવિક જીવનના પરિણામો વિશે ક્યારેય ખાતરીનો દાવો કરતું નથી.",
    },
  },
];
