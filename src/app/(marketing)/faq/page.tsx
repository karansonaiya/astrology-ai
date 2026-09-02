"use client";

import { useI18n, useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FAQS = [
  {
    q: { en: "Is this real astrology or AI-generated?", hi: "क्या यह असली ज्योतिष है या AI-जनित?", gu: "શું આ ખરું જ્યોતિષ છે કે AI-જનિત?" },
    a: {
      en: "Prerna AI provides AI-generated, astrology-style guidance for reflection — not a certain prediction. Every answer is clearly labelled.",
      hi: "Prerna AI चिंतन के लिए AI-जनित, ज्योतिष-शैली मार्गदर्शन देता है — निश्चित भविष्यवाणी नहीं। हर जवाब स्पष्ट रूप से चिह्नित है।",
      gu: "Prerna AI ચિંતન માટે AI-જનિત, જ્યોતિષ-શૈલી માર્ગદર્શન આપે છે — ખાતરીપૂર્વકની આગાહી નહીં. દરેક જવાબ સ્પષ્ટપણે દર્શાવેલ છે.",
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
    q: { en: "Can I get a refund?", hi: "क्या मुझे रिफंड मिल सकता है?", gu: "શું મને રિફંડ મળી શકે?" },
    a: {
      en: "Yes — see the Refund & Cancellation Policy. Refund requests are reviewed manually by our team.",
      hi: "हां — रिफंड और रद्दीकरण नीति देखें। रिफंड अनुरोधों की हमारी टीम द्वारा मैन्युअल रूप से समीक्षा की जाती है।",
      gu: "હા — રિફંડ અને રદ્દીકરણ નીતિ જુઓ. રિફંડ વિનંતીઓની અમારી ટીમ દ્વારા મેન્યુઅલી સમીક્ષા કરવામાં આવે છે.",
    },
  },
  {
    q: { en: "Can Prerna AI diagnose health, legal, or financial issues?", hi: "क्या Prerna AI स्वास्थ्य, कानूनी या वित्तीय मुद्दों का निदान कर सकता है?", gu: "શું Prerna AI આરોગ્ય, કાનૂની કે નાણાકીય મુદ્દાઓનું નિદાન કરી શકે?" },
    a: {
      en: "No. Prerna AI is not able to give medical, legal, or financial advice, and will always direct you to a qualified professional for these.",
      hi: "नहीं। Prerna AI चिकित्सा, कानूनी या वित्तीय सलाह नहीं दे सकता, और हमेशा आपको इसके लिए किसी योग्य विशेषज्ञ के पास भेजेगा।",
      gu: "ના. Prerna AI તબીબી, કાનૂની કે નાણાકીય સલાહ આપી શકતું નથી, અને હંમેશા તમને આ માટે યોગ્ય નિષ્ણાત પાસે મોકલશે.",
    },
  },
];

export default function FaqPage() {
  const t = useT();
  const { locale } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{t("landing.faqTitle")}</h1>
      <div className="mt-8 flex flex-col gap-4">
        {FAQS.map((f) => (
          <Card key={f.q.en}>
            <CardHeader>
              <CardTitle className="text-base">{f.q[locale]}</CardTitle>
              <CardDescription>{f.a[locale]}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
