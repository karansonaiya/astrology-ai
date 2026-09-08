import type { Faq } from "./faqs";

/**
 * Per-page FAQ sections — one topical set per public content page
 * (panchang/horoscope/blog), separate from the general app FAQ in
 * faqs.ts. An SEO pass asked for this specifically: a generic, app-wide
 * FAQ doesn't answer what someone landing on /panchang or /horoscope from
 * a search actually wants to know about THAT page's topic, and having the
 * question genuinely relevant to the page it sits on is the whole point
 * (both for the reader and for how a search engine reads the page).
 */

export const PANCHANG_FAQS: Faq[] = [
  {
    q: {
      en: "What is a Panchang?",
      hi: "पंचांग क्या है?",
      gu: "પંચાંગ શું છે?",
    },
    a: {
      en: "A Panchang is a traditional Hindu calendar that lays out five elements for a given day and place — tithi (lunar day), nakshatra (star constellation), yoga, karana, and vaara (weekday) — along with sunrise/sunset and auspicious/inauspicious timing windows.",
      hi: "पंचांग एक पारंपरिक हिंदू कैलेंडर है जो किसी दिन और स्थान के लिए पांच तत्व बताता है — तिथि, नक्षत्र, योग, करण, और वार — साथ ही सूर्योदय/सूर्यास्त और शुभ-अशुभ समय भी।",
      gu: "પંચાંગ એક પરંપરાગત હિન્દુ કૅલેન્ડર છે જે કોઈ દિવસ અને સ્થળ માટે પાંચ તત્વો બતાવે છે — તિથિ, નક્ષત્ર, યોગ, કરણ, અને વાર — સાથે સૂર્યોદય/સૂર્યાસ્ત અને શુભ-અશુભ સમય પણ.",
    },
  },
  {
    q: {
      en: "What is Choghadiya and how do I use it?",
      hi: "चौघड़िया क्या है और इसका उपयोग कैसे करें?",
      gu: "ચોઘડિયા શું છે અને તેનો ઉપયોગ કેવી રીતે કરવો?",
    },
    a: {
      en: "Choghadiya divides daytime and nighttime into 8 slots each, labelled Amrut, Shubh, Labh, etc. Slots marked Auspicious/Most Auspicious are generally preferred for starting something new (travel, a purchase, an important conversation); Inauspicious slots are usually avoided for the same.",
      hi: "चौघड़िया दिन और रात को 8-8 हिस्सों में बांटता है, जिन्हें अमृत, शुभ, लाभ आदि नाम दिए जाते हैं। शुभ/अति शुभ चिह्नित समय आमतौर पर कुछ नया शुरू करने (यात्रा, खरीदारी, ज़रूरी बातचीत) के लिए बेहतर माना जाता है; अशुभ समय आमतौर पर इसके लिए टाला जाता है।",
      gu: "ચોઘડિયા દિવસ અને રાત્રિને 8-8 ભાગમાં વહેંચે છે, જેને અમૃત, શુભ, લાભ વગેરે નામ અપાય છે. શુભ/અતિ શુભ ચિહ્નિત સમય સામાન્ય રીતે કંઈક નવું શરૂ કરવા (મુસાફરી, ખરીદી, જરૂરી વાતચીત) માટે વધુ સારો ગણાય છે; અશુભ સમય સામાન્ય રીતે તે માટે ટાળવામાં આવે છે.",
    },
  },
  {
    q: {
      en: "What do the auspicious and inauspicious periods mean?",
      hi: "शुभ और अशुभ काल का क्या मतलब है?",
      gu: "શુભ અને અશુભ કાળનો શું અર્થ છે?",
    },
    a: {
      en: "Alongside choghadiya, the page also shows named windows like Abhijit Muhurat and Amrit Kaal (auspicious) and Rahu Kaal, Yamaganda, Gulika (inauspicious) — these come from a separate, older calculation method traditionally used for timing important events, and are shown together since both are commonly consulted side by side.",
      hi: "चौघड़िया के साथ-साथ, पेज पर अभिजीत मुहूर्त और अमृत काल (शुभ) तथा राहु काल, यमगंड, गुलिक (अशुभ) जैसे नामित समय भी दिखाए जाते हैं — ये एक अलग, पुरानी गणना पद्धति से आते हैं जो पारंपरिक रूप से ज़रूरी कार्यों का समय तय करने के लिए इस्तेमाल होती है, और दोनों को साथ दिखाया जाता है क्योंकि दोनों को अक्सर एक साथ देखा जाता है।",
      gu: "ચોઘડિયાની સાથે, પેજ પર અભિજિત મુહૂર્ત અને અમૃત કાળ (શુભ) તથા રાહુ કાળ, યમગંડ, ગુલિક (અશુભ) જેવા નામાંકિત સમય પણ બતાવાય છે — આ એક અલગ, જૂની ગણતરી પદ્ધતિમાંથી આવે છે જે પરંપરાગત રીતે જરૂરી કાર્યોનો સમય નક્કી કરવા વપરાય છે, અને બંનેને સાથે બતાવાય છે કેમ કે બંને ઘણીવાર સાથે જ જોવાય છે.",
    },
  },
  {
    q: {
      en: "Can I check the panchang for a different city or date?",
      hi: "क्या मैं किसी दूसरे शहर या तारीख़ का पंचांग देख सकता हूं?",
      gu: "શું હું બીજા શહેર કે તારીખનું પંચાંગ જોઈ શકું?",
    },
    a: {
      en: "Yes. Type any city into the City field and pick a date, or switch to Month view to browse a whole month at once. Panchang genuinely changes with location — sunrise/sunset and the exact tithi/nakshatra timing shift depending on where you are.",
      hi: "हां। City फ़ील्ड में कोई भी शहर टाइप करें और तारीख़ चुनें, या पूरे महीने को एक साथ देखने के लिए Month व्यू पर जाएं। पंचांग सचमुच स्थान के साथ बदलता है — सूर्योदय/सूर्यास्त और सटीक तिथि/नक्षत्र का समय आपकी जगह के अनुसार बदलता है।",
      gu: "હા. City ફિલ્ડમાં કોઈ પણ શહેર ટાઇપ કરો અને તારીખ પસંદ કરો, અથવા આખો મહિનો એકસાથે જોવા Month વ્યુ પર જાઓ. પંચાંગ ખરેખર સ્થાન સાથે બદલાય છે — સૂર્યોદય/સૂર્યાસ્ત અને ચોક્કસ તિથિ/નક્ષત્રનો સમય તમારી જગ્યા પ્રમાણે બદલાય છે.",
    },
  },
  {
    q: {
      en: "How accurate is this panchang?",
      hi: "यह पंचांग कितना सटीक है?",
      gu: "આ પંચાંગ કેટલું ચોક્કસ છે?",
    },
    a: {
      en: "It's a real astronomical calculation (Lahiri ayanamsa, sidereal), not AI-generated text — the same underlying math a printed panchang uses, computed for your exact city and date rather than a generic regional one.",
      hi: "यह एक वास्तविक खगोलीय गणना है (लाहिड़ी अयनांश, सायडेरियल), AI-जनित टेक्स्ट नहीं — वही गणित जो छपे हुए पंचांग में इस्तेमाल होता है, बस आपके सटीक शहर और तारीख़ के लिए, किसी सामान्य क्षेत्रीय पंचांग की जगह।",
      gu: "આ એક ખરી ખગોળીય ગણતરી છે (લાહિરી અયનાંશ, સાયડેરિયલ), AI-જનિત ટેક્સ્ટ નથી — એ જ ગણિત જે છપાયેલા પંચાંગમાં વપરાય છે, બસ તમારા ચોક્કસ શહેર અને તારીખ માટે, કોઈ સામાન્ય પ્રાદેશિક પંચાંગને બદલે.",
    },
  },
];

export const HOROSCOPE_FAQS: Faq[] = [
  {
    q: {
      en: "How often does the daily horoscope update?",
      hi: "दैनिक राशिफल कितनी बार अपडेट होता है?",
      gu: "દૈનિક રાશિફળ કેટલી વાર અપડેટ થાય છે?",
    },
    a: {
      en: "Once a day for every sign, generated fresh each morning. Weekly and monthly outlooks update on Mondays and the 1st of the month respectively.",
      hi: "हर राशि के लिए दिन में एक बार, हर सुबह नया जनरेट होता है। साप्ताहिक और मासिक राशिफल क्रमशः सोमवार और महीने की 1 तारीख़ को अपडेट होते हैं।",
      gu: "દરેક રાશિ માટે દિવસમાં એક વાર, દરરોજ સવારે તાજું જનરેટ થાય છે. સાપ્તાહિક અને માસિક રાશિફળ અનુક્રમે સોમવારે અને મહિનાની 1 તારીખે અપડેટ થાય છે.",
    },
  },
  {
    q: {
      en: "Is this personalized to my exact birth chart, or general for the whole sign?",
      hi: "क्या यह मेरी सटीक कुंडली के अनुसार है, या पूरी राशि के लिए सामान्य है?",
      gu: "શું આ મારી ચોક્કસ કુંડળી પ્રમાણે છે, કે આખી રાશિ માટે સામાન્ય છે?",
    },
    a: {
      en: "This page's reading is general — the same one everyone with that sun sign sees, based on real current planetary transits. For a reading grounded in your own exact chart (moon sign, ascendant, houses), use Ask Prerna AI or the Kundli page after signing in.",
      hi: "इस पेज का पढ़ाव सामान्य है — उसी सूर्य राशि वाले सभी को यही दिखता है, असली वर्तमान ग्रह गोचर पर आधारित। आपकी अपनी सटीक कुंडली (चंद्र राशि, लग्न, भाव) पर आधारित जवाब के लिए, साइन इन करने के बाद Ask Prerna AI या Kundli पेज इस्तेमाल करें।",
      gu: "આ પેજનું વાંચન સામાન્ય છે — એ જ સૂર્ય રાશિ ધરાવતા બધાને આ જ દેખાય છે, ખરા વર્તમાન ગ્રહ ગોચર પર આધારિત. તમારી પોતાની ચોક્કસ કુંડળી (ચંદ્ર રાશિ, લગ્ન, ભાવ) પર આધારિત જવાબ માટે, સાઇન ઇન કર્યા પછી Ask Prerna AI અથવા Kundli પેજ વાપરો.",
    },
  },
  {
    q: {
      en: "What's the difference between daily, weekly, and monthly?",
      hi: "दैनिक, साप्ताहिक और मासिक में क्या फ़र्क़ है?",
      gu: "દૈનિક, સાપ્તાહિક અને માસિકમાં શું ફરક છે?",
    },
    a: {
      en: "Daily reflects today's specific transits; weekly and monthly step back to broader planetary movements over that longer window, so they read more like a general theme than a day-by-day account.",
      hi: "दैनिक आज के विशेष गोचर को दर्शाता है; साप्ताहिक और मासिक उस लंबी अवधि में व्यापक ग्रह गति पर नज़र डालते हैं, इसलिए ये दिन-प्रतिदिन के ब्यौरे की बजाय एक व्यापक विषय जैसे लगते हैं।",
      gu: "દૈનિક આજના ચોક્કસ ગોચરને દર્શાવે છે; સાપ્તાહિક અને માસિક તે લાંબા ગાળામાં વ્યાપક ગ્રહ ગતિ પર નજર કરે છે, એટલે તે દિવસ-પ્રતિદિનના વર્ણનને બદલે એક વ્યાપક વિષય જેવા લાગે છે.",
    },
  },
  {
    q: {
      en: "Can I read the horoscope for a sign that isn't mine?",
      hi: "क्या मैं अपनी राशि के अलावा किसी और राशि का राशिफल पढ़ सकता हूं?",
      gu: "શું હું મારી સિવાયની બીજી રાશિનું રાશિફળ વાંચી શકું?",
    },
    a: {
      en: "Yes — every sign's reading is open to everyone, no sign-in needed. Tap any of the 12 signs at the top to switch.",
      hi: "हां — हर राशि का पढ़ाव सबके लिए खुला है, साइन इन की ज़रूरत नहीं। ऊपर दी गई 12 राशियों में से किसी पर भी टैप करके बदलें।",
      gu: "હા — દરેક રાશિનું વાંચન બધા માટે ખુલ્લું છે, સાઇન ઇનની જરૂર નથી. ઉપર આપેલી 12 રાશિમાંથી કોઈ પણ પર ટૅપ કરીને બદલો.",
    },
  },
  {
    q: {
      en: "Are the lucky color and lucky number based on real calculation?",
      hi: "शुभ रंग और शुभ अंक क्या असली गणना पर आधारित हैं?",
      gu: "શુભ રંગ અને શુભ અંક શું ખરી ગણતરી પર આધારિત છે?",
    },
    a: {
      en: "They're generated alongside the rest of the reading, grounded in the same day's real transit data — not a random pick, though they're a lighter, more playful part of the reading than the career/love/health sections.",
      hi: "ये बाक़ी पढ़ाव के साथ ही, उसी दिन के असली गोचर डेटा पर आधारित होकर बनते हैं — कोई बेतरतीब चुनाव नहीं, हालांकि ये करियर/प्रेम/स्वास्थ्य वाले हिस्सों की तुलना में हल्का, ज़्यादा मनोरंजक हिस्सा हैं।",
      gu: "આ બાકીના વાંચનની સાથે જ, એ જ દિવસના ખરા ગોચર ડેટા પર આધારિત થઈને બને છે — કોઈ રેન્ડમ પસંદગી નહીં, જોકે આ કરિયર/પ્રેમ/આરોગ્ય વાળા ભાગો કરતાં હળવો, વધુ મનોરંજક ભાગ છે.",
    },
  },
];

export const BLOG_FAQS: Faq[] = [
  {
    q: {
      en: "How do I know my zodiac sign (rashi)?",
      hi: "मुझे अपनी राशि कैसे पता चले?",
      gu: "મને મારી રાશિ કેવી રીતે ખબર પડે?",
    },
    a: {
      en: "Match your birth date against the date ranges on this page — but note these are Vedic (sidereal) ranges, which run about 3-4 weeks later than the Western dates most horoscope columns use. For your exact moon sign and ascendant too, not just the sun sign, use the Kundli page after signing in.",
      hi: "इस पेज पर दी गई तारीख़ सीमाओं से अपनी जन्म तारीख़ मिलाएं — पर ध्यान दें कि ये वैदिक (सायडेरियल) सीमाएं हैं, जो ज़्यादातर राशिफल कॉलम में इस्तेमाल होने वाली पश्चिमी तारीख़ों से लगभग 3-4 हफ़्ते बाद शुरू होती हैं। सिर्फ़ सूर्य राशि नहीं, अपनी सटीक चंद्र राशि और लग्न के लिए भी, साइन इन करने के बाद Kundli पेज इस्तेमाल करें।",
      gu: "આ પેજ પર આપેલી તારીખ મર્યાદાઓ સાથે તમારી જન્મ તારીખ સરખાવો — પણ નોંધો કે આ વૈદિક (સાયડેરિયલ) મર્યાદાઓ છે, જે મોટાભાગના રાશિફળ કૉલમમાં વપરાતી પશ્ચિમી તારીખો કરતાં લગભગ 3-4 અઠવાડિયા મોડી શરૂ થાય છે. ફક્ત સૂર્ય રાશિ નહીં, તમારી ચોક્કસ ચંદ્ર રાશિ અને લગ્ન માટે પણ, સાઇન ઇન કર્યા પછી Kundli પેજ વાપરો.",
    },
  },
  {
    q: {
      en: "Why are these dates different from the ones I usually see?",
      hi: "ये तारीख़ें आमतौर पर मैंने जो देखा है उससे अलग क्यों हैं?",
      gu: "આ તારીખો હું સામાન્ય રીતે જોઉં છું તેનાથી અલગ કેમ છે?",
    },
    a: {
      en: "Most casual horoscope sources use the Western tropical zodiac. This app uses the Vedic sidereal zodiac (Lahiri ayanamsa) throughout, which is the same system its real astrology calculations run on — so the blog's dates match the app's own kundli/horoscope engine rather than a different convention.",
      hi: "ज़्यादातर आम राशिफल स्रोत पश्चिमी ट्रॉपिकल राशिचक्र इस्तेमाल करते हैं। यह ऐप हर जगह वैदिक सायडेरियल राशिचक्र (लाहिड़ी अयनांश) इस्तेमाल करता है, जो इसकी असली ज्योतिष गणना वाली ही प्रणाली है — तो ब्लॉग की तारीख़ें किसी अलग परंपरा की बजाय ऐप की अपनी कुंडली/राशिफल प्रणाली से मेल खाती हैं।",
      gu: "મોટાભાગના સામાન્ય રાશિફળ સ્રોત પશ્ચિમી ટ્રોપિકલ રાશિચક્ર વાપરે છે. આ એપ બધે વૈદિક સાયડેરિયલ રાશિચક્ર (લાહિરી અયનાંશ) વાપરે છે, જે તેની ખરી જ્યોતિષ ગણતરી વાળી જ પદ્ધતિ છે — તો બ્લોગની તારીખો કોઈ અલગ પરંપરાને બદલે એપની પોતાની કુંડળી/રાશિફળ પદ્ધતિ સાથે મળે છે.",
    },
  },
  {
    q: {
      en: "What does \"ruling planet\" mean?",
      hi: "\"स्वामी ग्रह\" का क्या मतलब है?",
      gu: "\"સ્વામી ગ્રહ\" નો શું અર્થ છે?",
    },
    a: {
      en: "In Vedic astrology, every rashi is traditionally associated with one planet whose qualities are said to influence that sign's temperament — Mars for Aries' directness, Venus for Taurus's love of comfort, and so on.",
      hi: "वैदिक ज्योतिष में, हर राशि पारंपरिक रूप से एक ग्रह से जुड़ी होती है जिसके गुण उस राशि के स्वभाव को प्रभावित करते माने जाते हैं — मेष की स्पष्टवादिता के लिए मंगल, वृषभ के आराम-प्रेम के लिए शुक्र, वग़ैरह।",
      gu: "વૈદિક જ્યોતિષમાં, દરેક રાશિ પરંપરાગત રીતે એક ગ્રહ સાથે જોડાયેલી હોય છે જેના ગુણો એ રાશિના સ્વભાવને પ્રભાવિત કરતા મનાય છે — મેષની સ્પષ્ટવાદિતા માટે મંગળ, વૃષભના આરામ-પ્રેમ માટે શુક્ર, વગેરે.",
    },
  },
  {
    q: {
      en: "How is compatibility between two signs decided?",
      hi: "दो राशियों के बीच अनुकूलता कैसे तय होती है?",
      gu: "બે રાશિ વચ્ચે અનુકૂળતા કેવી રીતે નક્કી થાય છે?",
    },
    a: {
      en: "The \"compatible with\" list here is a general, sign-level starting point (usually signs sharing or complementing an element/quality). For an actual compatibility reading between two specific people's real charts, use the Compatibility page instead — it's a different, much more detailed comparison.",
      hi: "यहां दी \"अनुकूल राशियां\" सूची एक सामान्य, राशि-स्तर की शुरुआत है (आमतौर पर वे राशियां जो तत्व/गुण साझा या पूरक करती हैं)। दो असली लोगों की सटीक कुंडली के बीच वास्तविक अनुकूलता के लिए, Compatibility पेज इस्तेमाल करें — वह एक अलग, कहीं अधिक विस्तृत तुलना है।",
      gu: "અહીં આપેલી \"અનુકૂળ રાશિ\" યાદી એક સામાન્ય, રાશિ-સ્તરની શરૂઆત છે (સામાન્ય રીતે એવી રાશિઓ જે તત્વ/ગુણ વહેંચે અથવા પૂરક બને). બે ખરી વ્યક્તિની ચોક્કસ કુંડળી વચ્ચે ખરી અનુકૂળતા માટે, Compatibility પેજ વાપરો — તે એક અલગ, ઘણી વધુ વિગતવાર સરખામણી છે.",
    },
  },
  {
    q: {
      en: "What are the \"naming letters\" for?",
      hi: "\"नामकरण अक्षर\" किसलिए हैं?",
      gu: "\"નામકરણ અક્ષરો\" શા માટે છે?",
    },
    a: {
      en: "In Vedic tradition, a baby's name is often chosen starting with a syllable tied to their birth nakshatra. What's shown here is a simplified, representative set for the rashi as a whole — the fully precise version depends on the specific nakshatra pada at birth, which needs an actual chart, not just a date range.",
      hi: "वैदिक परंपरा में, बच्चे का नाम अक्सर उसकी जन्म नक्षत्र से जुड़े अक्षर से शुरू होकर रखा जाता है। यहां दिखाया गया राशि के लिए एक सरल, प्रतिनिधि सेट है — पूरी तरह सटीक संस्करण जन्म के समय के विशिष्ट नक्षत्र पद पर निर्भर करता है, जिसके लिए एक असली कुंडली चाहिए, सिर्फ़ तारीख़ सीमा नहीं।",
      gu: "વૈદિક પરંપરામાં, બાળકનું નામ ઘણીવાર તેની જન્મ નક્ષત્ર સાથે જોડાયેલ અક્ષરથી શરૂ કરીને રખાય છે. અહીં બતાવેલું રાશિ માટેનું એક સરળ, પ્રતિનિધિ સેટ છે — સંપૂર્ણ ચોક્કસ આવૃત્તિ જન્મ સમયના ચોક્કસ નક્ષત્ર પદ પર આધારિત છે, જેના માટે ખરી કુંડળી જોઈએ, ફક્ત તારીખ મર્યાદા નહીં.",
    },
  },
  {
    q: {
      en: "Is this the same as my personal kundli?",
      hi: "क्या यह मेरी निजी कुंडली जैसा ही है?",
      gu: "શું આ મારી અંગત કુંડળી જેવું જ છે?",
    },
    a: {
      en: "No — this is general reference material about the 12 rashis themselves, the same kind of information any Vedic astrology reference publishes. Your personal kundli is a real calculation from your own birth date, time, and place, and lives on the Kundli page.",
      hi: "नहीं — यह 12 राशियों के बारे में सामान्य संदर्भ सामग्री है, वही जानकारी जो कोई भी वैदिक ज्योतिष संदर्भ प्रकाशित करता है। आपकी निजी कुंडली आपकी अपनी जन्म तारीख़, समय और स्थान से बनी एक असली गणना है, जो Kundli पेज पर मिलती है।",
      gu: "ના — આ 12 રાશિઓ વિશે સામાન્ય સંદર્ભ સામગ્રી છે, એ જ માહિતી જે કોઈ પણ વૈદિક જ્યોતિષ સંદર્ભ પ્રકાશિત કરે છે. તમારી અંગત કુંડળી તમારી પોતાની જન્મ તારીખ, સમય અને સ્થળથી બનેલી ખરી ગણતરી છે, જે Kundli પેજ પર મળે છે.",
    },
  },
];
