"use client";

import { MessageCircle, Sun, Sparkles, GitCompareArrows, FileText, Languages } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FeaturesPage() {
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
      <h1 className="font-heading text-3xl font-semibold">{t("landing.featuresTitle")}</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon size={22} className="mb-2 text-gold" />
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
