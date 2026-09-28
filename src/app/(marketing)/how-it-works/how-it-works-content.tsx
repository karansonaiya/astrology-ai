"use client";

import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionBadge } from "@/components/marketing/section-badge";

export function HowItWorksContent() {
  const t = useT();
  const steps = [
    { title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <div className="text-center">
        <SectionBadge>{t("landing.howItWorksEyebrow")}</SectionBadge>
        <h1 className="mt-4 font-heading text-3xl font-semibold">{t("landing.howItWorksTitle")}</h1>
        <p className="mt-3 text-muted">{t("common.disclaimerFull")}</p>
      </div>
      <div className="mt-10 flex flex-col gap-5">
        {steps.map((s, i) => (
          <Card key={s.title} className="border-none bg-surface shadow-sm">
            <CardHeader>
              <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                {i + 1}
              </span>
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
