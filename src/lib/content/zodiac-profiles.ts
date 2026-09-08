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
      en: "Mars rules Mesha, the first sign of the zodiac, and it shows in a fire-forward temperament that leans toward action before analysis. A strong Aries influence tends to show up as directness and a fast start — the kind of energy that gets a project moving when everyone else is still deliberating. The flip side is impatience: waiting is rarely this sign's strong suit. As with any archetype, this describes a general tendency, not any specific chart.",
      hi: "मेष राशिचक्र की पहली राशि है, इसके स्वामी मंगल हैं, और इसका अग्नि तत्व विश्लेषण से पहले काम करने की प्रवृत्ति में झलकता है। मेष का प्रभाव अधिक होने पर अक्सर स्पष्टवादिता और तेज़ शुरुआत दिखती है — वह ऊर्जा जो किसी काम को तभी आगे बढ़ा देती है जब बाकी लोग अभी सोच ही रहे होते हैं। दूसरी तरफ अधीरता है: इंतज़ार करना इस राशि की खूबी नहीं। किसी भी प्रतिरूप की तरह, यह एक सामान्य प्रवृत्ति है, किसी एक कुंडली का वर्णन नहीं।",
      gu: "મેષ રાશિચક્રની પહેલી રાશિ છે, તેના સ્વામી મંગળ છે, અને તેનું અગ્નિ તત્વ વિશ્લેષણ પહેલા કામ કરવાની વૃત્તિમાં દેખાય છે. મેષનો પ્રભાવ વધુ હોય ત્યારે ઘણીવાર સ્પષ્ટવાદિતા અને ઝડપી શરૂઆત દેખાય છે — એવી ઊર્જા જે કોઈ કામને ત્યારે જ આગળ ધપાવી દે જ્યારે બાકીના હજુ વિચારી જ રહ્યા હોય. બીજી બાજુ અધીરાઈ છે: રાહ જોવી આ રાશિની ખાસિયત નથી. કોઈ પણ પ્રતિરૂપની જેમ, આ એક સામાન્ય વૃત્તિ છે, કોઈ એક કુંડળીનું વર્ણન નથી.",
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
      en: "Vrishabha sits under Venus's rule, and its earth element grounds it in steadiness rather than speed. People with a pronounced Taurus placement are typically the ones others lean on when things get chaotic — calm, consistent, unhurried. That same steadiness can turn into stubbornness once a decision is made, since changing course isn't this sign's natural instinct.",
      hi: "वृषभ शुक्र के अधीन है, और इसका पृथ्वी तत्व इसे गति की बजाय स्थिरता में जड़ें जमाने देता है। जिन पर वृषभ का प्रभाव अधिक होता है, वे अक्सर वही लोग होते हैं जिन पर औरों को अफ़रा-तफ़री में भरोसा होता है — शांत, स्थिर, बिना जल्दबाज़ी के। वही स्थिरता एक बार फैसला हो जाने पर ज़िद में बदल सकती है, क्योंकि दिशा बदलना इस राशि की स्वाभाविक प्रवृत्ति नहीं।",
      gu: "વૃષભ શુક્રના તાબા હેઠળ છે, અને તેનું પૃથ્વી તત્વ તેને ઝડપને બદલે સ્થિરતામાં મૂળિયાં નાખવા દે છે. જેમના પર વૃષભનો પ્રભાવ વધુ હોય છે, તેઓ ઘણીવાર એ જ લોકો હોય છે જેમના પર બીજા અફરાતફરીમાં ભરોસો કરે છે — શાંત, સ્થિર, ઉતાવળ વગરના. એ જ સ્થિરતા એક વાર નિર્ણય લેવાયા પછી જિદમાં ફેરવાઈ શકે છે, કેમ કે દિશા બદલવી આ રાશિની સ્વાભાવિક વૃત્તિ નથી.",
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
      en: "Mercury governs Mithuna, an air sign built around curiosity and conversation. It's common for a strong Gemini influence to show up as quick thinking and an ease with words — someone who can talk comfortably about several different things in the same afternoon. The trade-off is depth: staying with one interest long enough to master it doesn't always come naturally.",
      hi: "मिथुन पर बुध का शासन है, और यह जिज्ञासा तथा बातचीत पर बनी वायु राशि है। मिथुन का प्रभाव अधिक होने पर अक्सर तेज़ सोच और शब्दों से सहजता दिखती है — कोई ऐसा व्यक्ति जो एक ही दोपहर में कई अलग-अलग विषयों पर सहजता से बात कर सके। कमी गहराई में है: किसी एक रुचि के साथ इतनी देर टिके रहना कि उसमें महारत हासिल हो, हमेशा स्वाभाविक नहीं होता।",
      gu: "મિથુન પર બુધનું શાસન છે, અને આ જિજ્ઞાસા તથા વાતચીત પર બનેલી વાયુ રાશિ છે. મિથુનનો પ્રભાવ વધુ હોય ત્યારે ઘણીવાર ઝડપી વિચારસરણી અને શબ્દો સાથે સહજતા દેખાય છે — એવી વ્યક્તિ જે એક જ બપોરમાં અનેક જુદા જુદા વિષયો પર સહજતાથી વાત કરી શકે. ખામી ઊંડાણમાં છે: કોઈ એક રુચિ સાથે એટલો સમય ટકી રહેવું કે તેમાં નિપુણતા મળે, એ હંમેશા સ્વાભાવિક નથી હોતું.",
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
      en: "The Moon rules Karka, and its water element runs toward feeling rather than logic. A strong Cancer influence usually means someone deeply tied to home and the people they consider family, with a protective instinct that kicks in fast. That same sensitivity means emotions, once stirred, don't fade quickly.",
      hi: "कर्क पर चंद्रमा का शासन है, और इसका जल तत्व तर्क की बजाय भावना की ओर झुकता है। कर्क का प्रभाव अधिक होने का मतलब आमतौर पर होता है कोई ऐसा व्यक्ति जो घर और अपने परिवार से गहराई से जुड़ा हो, और जिसमें सुरक्षा की सहज प्रवृत्ति जल्दी जाग उठे। वही संवेदनशीलता का मतलब है कि भावनाएं, एक बार जगने पर, जल्दी नहीं मिटतीं।",
      gu: "કર્ક પર ચંદ્રનું શાસન છે, અને તેનું જળ તત્વ તર્કને બદલે લાગણી તરફ ઝૂકે છે. કર્કનો પ્રભાવ વધુ હોવાનો અર્થ સામાન્ય રીતે એવી વ્યક્તિ થાય છે જે ઘર અને પોતાના પરિવાર સાથે ઊંડાણથી જોડાયેલ હોય, અને જેમાં રક્ષણની સહજ વૃત્તિ ઝડપથી જાગે. એ જ સંવેદનશીલતાનો અર્થ છે કે લાગણીઓ, એક વાર જાગ્યા પછી, ઝડપથી શમતી નથી.",
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
      en: "Simha is ruled by the Sun, and its fire shows up as confidence that's hard to miss. A strong Leo placement often brings natural warmth and generosity, along with a genuine wish to be seen and appreciated for effort put in. Left unchecked, that same wish for recognition can tip into wanting more attention than a room is willing to give.",
      hi: "सिंह सूर्य के अधीन है, और इसकी अग्नि आत्मविश्वास के रूप में दिखती है जिसे नज़रअंदाज़ करना मुश्किल है। सिंह का प्रभाव अधिक होने पर अक्सर स्वाभाविक गर्मजोशी और उदारता आती है, साथ ही अपने प्रयासों के लिए देखे और सराहे जाने की सच्ची चाहत भी। बिना नियंत्रण के, वही चाहत उतनी अधिक ध्यान चाहने में बदल सकती है जितना कोई कमरा देने को तैयार न हो।",
      gu: "સિંહ સૂર્યના તાબા હેઠળ છે, અને તેની અગ્નિ આત્મવિશ્વાસ તરીકે દેખાય છે જેને અવગણવું અઘરું છે. સિંહનો પ્રભાવ વધુ હોય ત્યારે ઘણીવાર સ્વાભાવિક ઉષ્મા અને ઉદારતા આવે છે, સાથે સાથે પોતાના પ્રયત્નો માટે જોવાયેલા અને વખણાયેલા બનવાની સાચી ઇચ્છા પણ. કાબૂ વગર, એ જ ઇચ્છા એટલું વધુ ધ્યાન ઇચ્છવામાં ફેરવાઈ શકે જેટલું કોઈ ઓરડો આપવા તૈયાર ન હોય.",
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
      en: "Mercury also rules Kanya, though its earth element pulls it toward precision instead of Gemini's breadth. Someone with a strong Virgo influence is usually the person who notices the detail everyone else missed, and takes responsibility seriously enough to follow through. The cost is self-criticism — Virgo tends to hold itself to a standard steeper than the situation actually demands.",
      hi: "कन्या पर भी बुध का शासन है, हालांकि इसका पृथ्वी तत्व इसे मिथुन की विस्तृतता की बजाय बारीकी की ओर खींचता है। कन्या का प्रभाव अधिक होने पर व्यक्ति आमतौर पर वही होता है जो वह बारीकी नोटिस करता है जिसे बाकी सब चूक गए, और ज़िम्मेदारी को इतनी गंभीरता से लेता है कि उसे पूरा भी करता है। कीमत है आत्म-आलोचना — कन्या अक्सर खुद पर वह मापदंड लगाती है जो स्थिति की वास्तविक ज़रूरत से कहीं ज़्यादा सख्त होता है।",
      gu: "કન્યા પર પણ બુધનું શાસન છે, જોકે તેનું પૃથ્વી તત્વ તેને મિથુનની વિસ્તૃતતાને બદલે બારીકાઈ તરફ ખેંચે છે. કન્યાનો પ્રભાવ વધુ હોય ત્યારે વ્યક્તિ સામાન્ય રીતે એ જ હોય છે જે એ બારીક વિગત નોંધે જે બાકી બધા ચૂકી ગયા, અને જવાબદારીને એટલી ગંભીરતાથી લે કે તેને પૂરી પણ કરે. કિંમત છે સ્વ-ટીકા — કન્યા ઘણીવાર પોતાની જાત પર એવું ધોરણ લાગુ કરે છે જે પરિસ્થિતિની ખરી જરૂરિયાત કરતાં ઘણું કડક હોય.",
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
      en: "Venus rules Tula, and its air element leans toward balance and fairness rather than confrontation. A strong Libra influence generally makes someone easy to be around — diplomatic, considerate, genuinely uncomfortable with conflict. That same discomfort can make decisions difficult whenever a choice risks upsetting someone.",
      hi: "तुला पर शुक्र का शासन है, और इसका वायु तत्व टकराव की बजाय संतुलन और निष्पक्षता की ओर झुकता है। तुला का प्रभाव अधिक होने पर व्यक्ति आमतौर पर साथ रहने में आसान होता है — कूटनीतिक, विचारशील, टकराव से सच में असहज। वही असहजता फैसलों को मुश्किल बना सकती है जब भी कोई चुनाव किसी को नाराज़ करने का जोखिम रखता हो।",
      gu: "તુલા પર શુક્રનું શાસન છે, અને તેનું વાયુ તત્વ ટકરાવને બદલે સંતુલન અને નિષ્પક્ષતા તરફ ઝૂકે છે. તુલાનો પ્રભાવ વધુ હોય ત્યારે વ્યક્તિ સામાન્ય રીતે સાથે રહેવામાં સરળ હોય છે — કૂટનીતિક, વિચારશીલ, ટકરાવથી ખરેખર અસ્વસ્થ. એ જ અસ્વસ્થતા નિર્ણયોને અઘરા બનાવી શકે છે જ્યારે પણ કોઈ પસંદગી કોઈને નારાજ કરવાનું જોખમ ધરાવતી હોય.",
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
      en: "Mars rules Vrishchika as well, but its water element channels that energy inward rather than out — intensity instead of impatience. Someone with a strong Scorpio placement usually prefers real depth over small talk, and once trust is earned, tends to stay fiercely loyal. Earning that trust, though, can take longer than it does with most other signs.",
      hi: "वृश्चिक पर भी मंगल का शासन है, लेकिन इसका जल तत्व उस ऊर्जा को बाहर की बजाय भीतर की ओर मोड़ता है — अधीरता की जगह तीव्रता। वृश्चिक का प्रभाव अधिक होने पर व्यक्ति आमतौर पर सतही बातचीत की बजाय असली गहराई पसंद करता है, और एक बार भरोसा जीत लिए जाने पर बेहद वफ़ादार रहता है। हालांकि, वह भरोसा जीतने में बाकी ज़्यादातर राशियों से ज़्यादा वक़्त लग सकता है।",
      gu: "વૃશ્ચિક પર પણ મંગળનું શાસન છે, પણ તેનું જળ તત્વ એ ઊર્જાને બહારને બદલે અંદર તરફ વાળે છે — અધીરાઈને બદલે તીવ્રતા. વૃશ્ચિકનો પ્રભાવ વધુ હોય ત્યારે વ્યક્તિ સામાન્ય રીતે સપાટી પરની વાતોને બદલે ખરું ઊંડાણ પસંદ કરે છે, અને એક વાર ભરોસો જીતાયા પછી સખત વફાદાર રહે છે. જોકે, એ ભરોસો જીતવામાં બાકીની મોટાભાગની રાશિઓ કરતાં વધુ સમય લાગી શકે છે.",
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
      en: "Jupiter rules Dhanu, and its fire element leans toward expansion — new places, new ideas, new questions worth chasing. A strong Sagittarius influence usually reads as optimistic and good-humoured, with an honesty that people either appreciate or find a little too blunt for the moment.",
      hi: "धनु पर बृहस्पति का शासन है, और इसकी अग्नि विस्तार की ओर झुकती है — नई जगहें, नए विचार, पीछा करने लायक नए सवाल। धनु का प्रभाव अधिक होने पर आमतौर पर आशावाद और खुशमिज़ाजी दिखती है, साथ ही एक ऐसी ईमानदारी जिसे लोग या तो सराहते हैं या पल के हिसाब से थोड़ा ज़्यादा साफ़गोई मान लेते हैं।",
      gu: "ધનુ પર ગુરુનું શાસન છે, અને તેની અગ્નિ વિસ્તરણ તરફ ઝૂકે છે — નવી જગ્યાઓ, નવા વિચારો, પીછો કરવા લાયક નવા સવાલો. ધનુનો પ્રભાવ વધુ હોય ત્યારે સામાન્ય રીતે આશાવાદ અને ખુશમિજાજી દેખાય છે, સાથે એવી પ્રામાણિકતા જેને લોકો કાં તો વખાણે છે અથવા પળના હિસાબે થોડી વધુ સ્પષ્ટ માની લે છે.",
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
      en: "Saturn governs Makara, and its earth element favors the long game over quick wins. People with a strong Capricorn placement tend to be dependable to a fault — steady, hardworking, patient with goals that take years to reach. What they often struggle with is the opposite: slowing down long enough to actually enjoy the progress they've made.",
      hi: "मकर पर शनि का शासन है, और इसका पृथ्वी तत्व त्वरित जीत की बजाय लंबे खेल को तरजीह देता है। मकर का प्रभाव अधिक रखने वाले लोग अक्सर हद से ज़्यादा भरोसेमंद होते हैं — स्थिर, मेहनती, ऐसे लक्ष्यों के साथ धैर्यवान जिन्हें पाने में सालों लग सकते हैं। जिस चीज़ से वे अक्सर जूझते हैं वह इसका उल्टा है: इतना धीमा पड़ना कि अपनी हासिल की गई प्रगति का सच में आनंद ले सकें।",
      gu: "મકર પર શનિનું શાસન છે, અને તેનું પૃથ્વી તત્વ ઝડપી જીતને બદલે લાંબી રમતને પ્રાધાન્ય આપે છે. મકરનો પ્રભાવ વધુ ધરાવતા લોકો ઘણીવાર હદ કરતાં વધુ ભરોસાપાત્ર હોય છે — સ્થિર, મહેનતુ, એવા લક્ષ્યો સાથે ધીરજવાન જેને પહોંચવામાં વર્ષો લાગી શકે. તેઓ ઘણીવાર જેની સાથે ઝઝૂમે છે તે તેનાથી ઊલટું છે: પોતે મેળવેલી પ્રગતિને ખરેખર માણી શકાય એટલા ધીમા પડવું.",
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
      en: "Kumbha is traditionally ruled by Saturn, and its air element points toward ideas that serve a group rather than just the self. A strong Aquarius influence usually shows up as independent thinking and a real commitment to fairness — the kind of person who'll stand apart from the crowd on principle. That same independence can read as emotional distance in the moment it's needed least.",
      hi: "कुंभ पर पारंपरिक रूप से शनि का शासन है, और इसका वायु तत्व सिर्फ खुद की बजाय समूह की सेवा करने वाले विचारों की ओर इशारा करता है। कुंभ का प्रभाव अधिक होने पर आमतौर पर स्वतंत्र सोच और निष्पक्षता के प्रति सच्ची प्रतिबद्धता दिखती है — ऐसा व्यक्ति जो सिद्धांत के आधार पर भीड़ से अलग खड़ा रहे। वही स्वतंत्रता ठीक उसी पल भावनात्मक दूरी जैसी लग सकती है जब उसकी सबसे कम ज़रूरत हो।",
      gu: "કુંભ પર પરંપરાગત રીતે શનિનું શાસન છે, અને તેનું વાયુ તત્વ ફક્ત પોતાને બદલે જૂથની સેવા કરતા વિચારો તરફ ઈશારો કરે છે. કુંભનો પ્રભાવ વધુ હોય ત્યારે સામાન્ય રીતે સ્વતંત્ર વિચારસરણી અને નિષ્પક્ષતા પ્રત્યે સાચી પ્રતિબદ્ધતા દેખાય છે — એવી વ્યક્તિ જે સિદ્ધાંતના આધારે ભીડથી અલગ ઊભી રહે. એ જ સ્વતંત્રતા બરાબર એ જ ક્ષણે ભાવનાત્મક અંતર જેવી લાગી શકે જ્યારે તેની સૌથી ઓછી જરૂર હોય.",
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
      en: "Jupiter rules Meena, and its water element leans the whole sign toward imagination and empathy. Someone with a strong Pisces influence often has a natural pull toward creative or spiritual reflection, along with real compassion for the people around them. The difficulty tends to be boundaries — Pisces can find it hard to say no to people it cares about.",
      hi: "मीन पर बृहस्पति का शासन है, और इसका जल तत्व पूरी राशि को कल्पनाशीलता और सहानुभूति की ओर झुकाता है। मीन का प्रभाव अधिक रखने वाले व्यक्ति में अक्सर रचनात्मक या आध्यात्मिक चिंतन की स्वाभाविक प्रवृत्ति होती है, साथ ही आसपास के लोगों के लिए सच्ची करुणा भी। मुश्किल आमतौर पर सीमाओं में होती है — मीन को उन लोगों को न कहना मुश्किल लग सकता है जिनकी वह परवाह करता है।",
      gu: "મીન પર ગુરુનું શાસન છે, અને તેનું જળ તત્વ આખી રાશિને કલ્પનાશીલતા અને સહાનુભૂતિ તરફ ઝુકાવે છે. મીનનો પ્રભાવ વધુ ધરાવતી વ્યક્તિમાં ઘણીવાર સર્જનાત્મક કે આધ્યાત્મિક ચિંતન તરફની સ્વાભાવિક વૃત્તિ હોય છે, સાથે આસપાસના લોકો માટે સાચી કરુણા પણ. મુશ્કેલી સામાન્ય રીતે સીમાઓમાં હોય છે — મીનને જેની તે કાળજી રાખે છે તેમને ના કહેવું અઘરું લાગી શકે.",
    },
    compatibleWith: ["cancer", "scorpio", "capricorn"],
  },
};
