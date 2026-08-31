"use client";

import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HowItWorksPage() {
  const t = useT();
  const steps = [
    { title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{t("landing.howItWorksTitle")}</h1>
      <p className="mt-3 text-muted">{t("common.disclaimerFull")}</p>
      <div className="mt-8 flex flex-col gap-5">
        {steps.map((s, i) => (
          <Card key={s.title}>
            <CardHeader>
              <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
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
