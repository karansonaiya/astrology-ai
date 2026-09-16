/**
 * A curated, real (not AI-invented) list of major pan-India Hindu
 * festivals/vrats for 2026 — same "real, verified reference content" status
 * as page-faqs.ts/zodiac-profiles.ts (locale-keyed inline, not part of the
 * UI-chrome i18n catalog, since this is content data, not interface text).
 *
 * No Prokerala endpoint exists for this (checked live alongside Kaal Sarp
 * Dosha/Kundli Matching — no festival/vrat field anywhere in its real
 * panchang response), so dates here are sourced and cross-checked against
 * real published 2026 Hindu calendars (drikpanchang, Prokerala's own public
 * Hindu calendar page, and independent panchang sites), not computed or
 * guessed. Regional/community-specific observances and the ~24 Ekadashis
 * are intentionally out of scope — this covers the major pan-India
 * festivals a general audience would look for, not an exhaustive calendar.
 * Exact regional timing can vary by a day depending on local sunrise-based
 * tithi transitions; dates here reflect the most commonly observed date.
 */
export type Festival = {
  name: string;
  date: string; // YYYY-MM-DD, 2026
  category: "major" | "vrat";
  description: { en: string; hi: string; gu: string };
};

export const FESTIVALS_2026: Festival[] = [
  {
    name: "Makar Sankranti",
    date: "2026-01-14",
    category: "major",
    description: {
      en: "Marks the sun's transit into Capricorn and the start of its northward journey — celebrated with kites, sesame-jaggery sweets, and river baths.",
      hi: "सूर्य के मकर राशि में प्रवेश और उत्तरायण की शुरुआत का प्रतीक - पतंगबाज़ी, तिल-गुड़ और नदी स्नान के साथ मनाया जाता है।",
      gu: "સૂર્યના મકર રાશિમાં પ્રવેશ અને ઉત્તરાયણની શરૂઆતનું પ્રતીક - પતંગ ચગાવવા, તલ-ગોળ અને નદી સ્નાન સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Vasant Panchami",
    date: "2026-01-23",
    category: "major",
    description: {
      en: "Dedicated to Goddess Saraswati, the deity of knowledge and the arts — students and artists traditionally begin new learning on this day.",
      hi: "ज्ञान और कला की देवी सरस्वती को समर्पित - छात्र और कलाकार परंपरागत रूप से इस दिन नई शिक्षा शुरू करते हैं।",
      gu: "જ્ઞાન અને કલાની દેવી સરસ્વતીને સમર્પિત - વિદ્યાર્થીઓ અને કલાકારો પરંપરાગત રીતે આ દિવસે નવું શિક્ષણ શરૂ કરે છે.",
    },
  },
  {
    name: "Maha Shivratri",
    date: "2026-02-15",
    category: "major",
    description: {
      en: "The 'Great Night of Shiva' — observed with fasting, night-long vigil, and worship at Shiva temples across India.",
      hi: "'शिव की महान रात्रि' - उपवास, रातभर जागरण और शिव मंदिरों में पूजा के साथ मनाया जाता है।",
      gu: "'શિવની મહાન રાત્રિ' - ઉપવાસ, રાતભર જાગરણ અને શિવ મંદિરોમાં પૂજા સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Holi",
    date: "2026-03-04",
    category: "major",
    description: {
      en: "The festival of colors, celebrating the arrival of spring and the triumph of good over evil — preceded by Holika Dahan the night before.",
      hi: "रंगों का त्योहार, वसंत के आगमन और बुराई पर अच्छाई की जीत का उत्सव - इससे एक रात पहले होलिका दहन होता है।",
      gu: "રંગોનો તહેવાર, વસંતના આગમન અને દુષ્ટતા પર સારાઈની જીતની ઉજવણી - આગલી રાત્રે હોલિકા દહન થાય છે.",
    },
  },
  {
    name: "Ram Navami",
    date: "2026-03-26",
    category: "major",
    description: {
      en: "Celebrates the birth of Lord Rama — marked with readings of the Ramayana, processions, and temple visits.",
      hi: "भगवान राम के जन्म का उत्सव - रामायण पाठ, शोभायात्रा और मंदिर दर्शन के साथ मनाया जाता है।",
      gu: "ભગવાન રામના જન્મની ઉજવણી - રામાયણ પઠન, શોભાયાત્રા અને મંદિર દર્શન સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Hanuman Jayanti",
    date: "2026-04-02",
    category: "major",
    description: {
      en: "Celebrates the birth of Lord Hanuman, revered for strength, courage, and devotion — marked with Hanuman Chalisa recitations.",
      hi: "शक्ति, साहस और भक्ति के लिए पूजनीय भगवान हनुमान के जन्म का उत्सव - हनुमान चालीसा पाठ के साथ मनाया जाता है।",
      gu: "શક્તિ, હિંમત અને ભક્તિ માટે પૂજનીય ભગવાન હનુમાનના જન્મની ઉજવણી - હનુમાન ચાલીસા પઠન સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Akshaya Tritiya",
    date: "2026-04-19",
    category: "major",
    description: {
      en: "An 'ever-auspicious' day traditionally considered favorable for new beginnings, gold purchases, and starting new ventures.",
      hi: "एक 'सदैव शुभ' दिन, परंपरागत रूप से नई शुरुआत, सोना खरीदने और नए उद्यम शुरू करने के लिए शुभ माना जाता है।",
      gu: "એક 'સદા શુભ' દિવસ, પરંપરાગત રીતે નવી શરૂઆત, સોનું ખરીદવા અને નવા સાહસો શરૂ કરવા માટે શુભ ગણાય છે.",
    },
  },
  {
    name: "Buddha Purnima",
    date: "2026-05-01",
    category: "major",
    description: {
      en: "Commemorates the birth, enlightenment, and passing of Gautam Buddha — observed with prayers and acts of charity.",
      hi: "गौतम बुद्ध के जन्म, ज्ञान प्राप्ति और महापरिनिर्वाण की स्मृति में - प्रार्थना और दान-पुण्य के साथ मनाया जाता है।",
      gu: "ગૌતમ બુદ્ધના જન્મ, જ્ઞાનપ્રાપ્તિ અને મહાપરિનિર્વાણની સ્મૃતિમાં - પ્રાર્થના અને દાન-પુણ્ય સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Rath Yatra",
    date: "2026-07-16",
    category: "major",
    description: {
      en: "The chariot festival of Lord Jagannath, most famously celebrated in Puri, Odisha, with massive processions pulling the deity's chariot.",
      hi: "भगवान जगन्नाथ की रथयात्रा, सबसे प्रसिद्ध रूप से पुरी, ओडिशा में मनाई जाती है, जहां विशाल शोभायात्रा में रथ खींचा जाता है।",
      gu: "ભગવાન જગન્નાથની રથયાત્રા, સૌથી પ્રખ્યાત રીતે પુરી, ઓડિશામાં ઉજવાય છે, જ્યાં વિશાળ શોભાયાત્રામાં રથ ખેંચાય છે.",
    },
  },
  {
    name: "Raksha Bandhan",
    date: "2026-08-28",
    category: "major",
    description: {
      en: "Celebrates the bond between brothers and sisters — sisters tie a protective thread (rakhi) on their brothers' wrists.",
      hi: "भाई-बहन के रिश्ते का उत्सव - बहनें भाइयों की कलाई पर रक्षा सूत्र (राखी) बांधती हैं।",
      gu: "ભાઈ-બહેનના સંબંધની ઉજવણી - બહેનો ભાઈઓના કાંડા પર રક્ષા સૂત્ર (રાખડી) બાંધે છે.",
    },
  },
  {
    name: "Janmashtami",
    date: "2026-09-04",
    category: "major",
    description: {
      en: "Celebrates the birth of Lord Krishna — marked with fasting, midnight prayers, and Dahi Handi festivities in many regions.",
      hi: "भगवान कृष्ण के जन्म का उत्सव - उपवास, मध्यरात्रि पूजा और कई क्षेत्रों में दही हांडी उत्सव के साथ मनाया जाता है।",
      gu: "ભગવાન કૃષ્ણના જન્મની ઉજવણી - ઉપવાસ, મધ્યરાત્રિ પૂજા અને ઘણા વિસ્તારોમાં દહીં હાંડી ઉત્સવ સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Ganesh Chaturthi",
    date: "2026-09-14",
    category: "major",
    description: {
      en: "Celebrates the birth of Lord Ganesha — marked with elaborate idol installations and processions, especially prominent in Maharashtra.",
      hi: "भगवान गणेश के जन्म का उत्सव - विशेष रूप से महाराष्ट्र में भव्य मूर्ति स्थापना और शोभायात्रा के साथ मनाया जाता है।",
      gu: "ભગવાન ગણેશના જન્મની ઉજવણી - ખાસ કરીને મહારાષ્ટ્રમાં ભવ્ય મૂર્તિ સ્થાપના અને શોભાયાત્રા સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Navratri Begins (Ghatasthapana)",
    date: "2026-10-11",
    category: "major",
    description: {
      en: "The start of nine nights honoring the nine forms of Goddess Durga — marked with Garba/Dandiya in Gujarat and Durga Puja pandals in the east.",
      hi: "देवी दुर्गा के नौ रूपों का सम्मान करने वाली नौ रातों की शुरुआत - गुजरात में गरबा/डांडिया और पूर्व में दुर्गा पूजा पंडालों के साथ मनाई जाती है।",
      gu: "દેવી દુર્ગાના નવ સ્વરૂપોનું સન્માન કરતી નવ રાત્રિઓની શરૂઆત - ગુજરાતમાં ગરબા/દાંડિયા અને પૂર્વમાં દુર્ગા પૂજા પંડાલો સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Dussehra (Vijayadashami)",
    date: "2026-10-20",
    category: "major",
    description: {
      en: "Marks the triumph of Lord Rama over Ravana, and the conclusion of Navratri — celebrated with Ravana-effigy burning across North India.",
      hi: "रावण पर भगवान राम की विजय और नवरात्रि के समापन का प्रतीक - उत्तर भारत में रावण दहन के साथ मनाया जाता है।",
      gu: "રાવણ પર ભગવાન રામની જીત અને નવરાત્રિના સમાપનનું પ્રતીક - ઉત્તર ભારતમાં રાવણ દહન સાથે ઉજવાય છે.",
    },
  },
  {
    name: "Karva Chauth",
    date: "2026-10-29",
    category: "vrat",
    description: {
      en: "A day-long fast observed by married women for their husbands' wellbeing and long life, broken after sighting the moon.",
      hi: "विवाहित महिलाओं द्वारा अपने पति की भलाई और लंबी आयु के लिए रखा जाने वाला दिनभर का व्रत, जो चंद्रमा देखने के बाद खोला जाता है।",
      gu: "પરિણીત મહિલાઓ દ્વારા તેમના પતિની સુખાકારી અને લાંબા આયુષ્ય માટે રખાતું આખા દિવસનું વ્રત, જે ચંદ્ર જોયા પછી છોડવામાં આવે છે.",
    },
  },
  {
    name: "Dhanteras",
    date: "2026-11-06",
    category: "major",
    description: {
      en: "The first day of the five-day Diwali festivities — traditionally considered auspicious for buying gold, silver, or new utensils.",
      hi: "पांच दिवसीय दीपावली उत्सव का पहला दिन - परंपरागत रूप से सोना, चांदी या नए बर्तन खरीदने के लिए शुभ माना जाता है।",
      gu: "પાંચ દિવસીય દિવાળી ઉત્સવનો પ્રથમ દિવસ - પરંપરાગત રીતે સોનું, ચાંદી અથવા નવા વાસણો ખરીદવા માટે શુભ ગણાય છે.",
    },
  },
  {
    name: "Diwali",
    date: "2026-11-08",
    category: "major",
    description: {
      en: "The festival of lights, celebrating the return of Lord Rama to Ayodhya and the triumph of light over darkness — the most widely celebrated Hindu festival.",
      hi: "रोशनी का त्योहार, भगवान राम की अयोध्या वापसी और अंधकार पर प्रकाश की विजय का उत्सव - सबसे व्यापक रूप से मनाया जाने वाला हिंदू त्योहार।",
      gu: "પ્રકાશનો તહેવાર, ભગવાન રામની અયોધ્યા વાપસી અને અંધકાર પર પ્રકાશની જીતની ઉજવણી - સૌથી વધુ વ્યાપક રીતે ઉજવાતો હિન્દુ તહેવાર.",
    },
  },
  {
    name: "Govardhan Puja",
    date: "2026-11-09",
    category: "major",
    description: {
      en: "Commemorates Lord Krishna lifting Govardhan Hill to protect villagers — the day after Diwali.",
      hi: "भगवान कृष्ण द्वारा ग्रामवासियों की रक्षा के लिए गोवर्धन पर्वत उठाने की स्मृति में - दीपावली के अगले दिन।",
      gu: "ભગવાન કૃષ્ણ દ્વારા ગ્રામવાસીઓની રક્ષા માટે ગોવર્ધન પર્વત ઉપાડવાની સ્મૃતિમાં - દિવાળીના બીજા દિવસે.",
    },
  },
  {
    name: "Bhai Dooj",
    date: "2026-11-11",
    category: "major",
    description: {
      en: "Celebrates the bond between brothers and sisters, marking the close of the Diwali festivities.",
      hi: "भाई-बहन के रिश्ते का उत्सव, जो दीपावली उत्सव के समापन का प्रतीक है।",
      gu: "ભાઈ-બહેનના સંબંધની ઉજવણી, જે દિવાળી ઉત્સવના સમાપનનું પ્રતીક છે.",
    },
  },
  {
    name: "Chhath Puja",
    date: "2026-11-15",
    category: "major",
    description: {
      en: "A rigorous multi-day fast dedicated to the Sun God, especially prominent in Bihar, Jharkhand, and eastern Uttar Pradesh.",
      hi: "सूर्य देव को समर्पित एक कठोर बहु-दिवसीय व्रत, विशेष रूप से बिहार, झारखंड और पूर्वी उत्तर प्रदेश में प्रमुख।",
      gu: "સૂર્ય દેવને સમર્પિત એક કઠોર બહુ-દિવસીય વ્રત, ખાસ કરીને બિહાર, ઝારખંડ અને પૂર્વ ઉત્તર પ્રદેશમાં પ્રમુખ.",
    },
  },
];
