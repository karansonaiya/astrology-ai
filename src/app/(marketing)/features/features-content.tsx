"use client";

import { MessageCircle, Sun, Sparkles, GitCompareArrows, FileText, Languages } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectionBadge } from "@/components/marketing/section-badge";

export function FeaturesContent() {
  const t = useT();
  const features = [
    { icon: MessageCircle, title: t("landing.featureChatTitle"), desc: t("landing.featureChatDesc") },
    { icon: Sun, title: t("landing.featureHoroscopeTitle"), desc: t("landing.featureHoroscopeDesc") },
    { icon: Sparkles, title: t("landing.featureKundliTitle"), desc: t("landing.featureKundliDesc") },
    { icon: GitCompareArrows, title: t("landing.featureCompatibilityTitle"), desc: t("landing.featureCompatibilityDesc") },
    { icon: FileText, title: t("landing.featureReportsTitle"), desc: t("landing.featureReportsDesc") },
    { icon: Languages, title: t("landing.featureLanguageTitle"), desc: t("landing.featureLanguageDesc") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <div className="text-center">
        <SectionBadge>{t("landing.featuresEyebrow")}</SectionBadge>
        <h1 className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-semibold md:text-4xl">{t("landing.featuresTitle")}</h1>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-tan/40 text-tan-foreground">
                <f.icon size={20} />
              </span>
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
