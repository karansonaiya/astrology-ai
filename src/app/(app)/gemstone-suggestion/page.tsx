"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gem, Sparkles, FileText } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { GEMSTONE_REPORT_CODES } from "@/lib/pricing/catalog";

type ReportTemplate = { code: string; priceInPaise: number };
type GemstoneRecommendation = {
  moonSign: string;
  rulingPlanet: string;
  gemstone: { en: string; hi: string; gu: string };
  rudrakshaMukhi: number;
  debilitatedPlanets: { planet: string; sign: string }[];
};
type GemstoneReading = {
  title: string;
  explanation: string;
  debilitatedNote: string | null;
  practicalGuidance: string;
  summary: string;
};
type Result = { recommendation: GemstoneRecommendation; reading: GemstoneReading };

export default function GemstoneSuggestionPage() {
  const t = useT();
  const { locale } = useI18n();
  const [result, setResult] = useState<Result | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);
  const [noProfile, setNoProfile] = useState(false);

  const generate = useMutation({
    mutationFn: () => apiFetch<Result>("/api/gemstone-suggestion", { method: "POST" }),
    onSuccess: (res) => setResult(res),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else if (err instanceof ApiError && err.status === 422) setNoProfile(true);
    },
  });

  const { data: templatesData } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: ReportTemplate[] }>("/api/reports/templates"),
  });
  const detailedReportPrice = templatesData?.templates.find((tp) => GEMSTONE_REPORT_CODES.has(tp.code))?.priceInPaise;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Gem size={22} className="text-primary" /> {t("gemstone.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("gemstone.subtitle")}</p>

      {noProfile && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">{t("gemstone.noProfileNotice")}</p>
            <Button asChild><Link href="/profile">{t("common.edit")}</Link></Button>
          </CardContent>
        </Card>
      )}

      {!result && !noProfile && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-muted">{t("gemstone.hint")}</p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles size={16} />
              {generate.isPending ? t("gemstone.generating") : t("gemstone.generate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {generate.isPending && <Skeleton className="mt-4 h-40" />}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="mb-2">
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
              </div>
              <p className="text-sm font-medium text-foreground">
                {t("gemstone.realDataLine", {
                  gemstone: result.recommendation.gemstone[locale],
                  mukhi: result.recommendation.rudrakshaMukhi,
                })}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{result.reading.explanation}</p>
            </CardContent>
          </Card>

          {result.reading.debilitatedNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("gemstone.debilitatedTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.reading.debilitatedNote}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("gemstone.practicalTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.reading.practicalGuidance}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <p className="text-sm leading-relaxed">{result.reading.summary}</p>
            </CardContent>
          </Card>

          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t("gemstone.detailedReportTitle")}</p>
                <p className="text-xs text-muted">{t("gemstone.detailedReportDesc")}</p>
              </div>
              <Button asChild className="shrink-0">
                <Link href="/reports">
                  <FileText size={16} />
                  {t("gemstone.getDetailedReport")}
                  {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-fit" onClick={() => setResult(null)}>
            {t("gemstone.startOver")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
