"use client";

import { useI18n, useT } from "@/lib/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SectionBadge } from "@/components/marketing/section-badge";
import { FAQS } from "@/lib/content/faqs";

export function FaqContent() {
  const t = useT();
  const { locale } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <div className="text-center">
        <SectionBadge>{t("landing.faqEyebrow")}</SectionBadge>
        <h1 className="mt-4 font-heading text-3xl font-semibold">{t("landing.faqTitle")}</h1>
        <p className="mt-3 text-muted">{t("landing.faqSubtitle")}</p>
      </div>
      <Card className="mt-10">
        <CardContent className="pt-5">
          <Accordion type="single" collapsible>
            {FAQS.map((f) => (
              <AccordionItem key={f.q.en} value={f.q.en}>
                <AccordionTrigger>{f.q[locale]}</AccordionTrigger>
                <AccordionContent>{f.a[locale]}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
