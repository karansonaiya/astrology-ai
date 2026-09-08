"use client";

import { useI18n, useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FAQS } from "@/lib/content/faqs";

export function FaqContent() {
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
