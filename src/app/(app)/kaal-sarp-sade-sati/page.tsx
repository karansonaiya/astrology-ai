"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Orbit, Sparkles, FileText, CircleCheck, CircleAlert } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { useToast } from "@/components/ui/toast";
import { KAAL_SARP_SADE_SATI_REPORT_CODES } from "@/lib/pricing/catalog";

type ReportTemplate = { code: string; priceInPaise: number };
type KaalSarpDosha = { hasDosha: boolean; type: "Anuloma" | "Viloma" | null; namedType: string | null; rahuHouse: number | null };
type SadeSatiStatus = { isActive: boolean; phase: "rising" | "peak" | "setting" | null; saturnTransitSign: string | null; moonSign: string };
type DoshaTransitReading = { title: string; kaalSarpExplanation: string; sadeSatiExplanation: string; remedyNote: string; summary: string };
type Result = { kaalSarp: KaalSarpDosha; sadeSati: SadeSatiStatus; reading: DoshaTransitReading };

export default function KaalSarpSadeSatiPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const [result, setResult] = useState<Result | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);
  const [noProfile, setNoProfile] = useState(false);

  const generate = useMutation({
    mutationFn: () => apiFetch<Result>("/api/kaal-sarp-sade-sati", { method: "POST" }),
    onSuccess: (res) => setResult(res),
    // Found in an audit: a genuine 500 fell through both branches here with
    // zero feedback — added a generic fallback, matching gemstone/face-reading.
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else if (err instanceof ApiError && err.status === 422) setNoProfile(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  const { data: templatesData } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: ReportTemplate[] }>("/api/reports/templates"),
  });
  const detailedReportPrice = templatesData?.templates.find((tp) => KAAL_SARP_SADE_SATI_REPORT_CODES.has(tp.code))?.priceInPaise;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Orbit size={22} className="text-primary" /> {t("kaalSarpSadeSati.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("kaalSarpSadeSati.subtitle")}</p>

      {noProfile && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">{t("kaalSarpSadeSati.noProfileNotice")}</p>
            <Button asChild><Link href="/profile">{t("common.edit")}</Link></Button>
          </CardContent>
        </Card>
      )}

      {!result && !noProfile && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-muted">{t("kaalSarpSadeSati.hint")}</p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles size={16} />
              {generate.isPending ? t("kaalSarpSadeSati.generating") : t("kaalSarpSadeSati.generate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {generate.isPending && <Skeleton className="mt-4 h-40" />}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="mb-1">
            <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
          </div>

          <Card className={result.kaalSarp.hasDosha ? "border-gold/30 bg-gold/5" : "border-primary/30 bg-primary/5"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                {result.kaalSarp.hasDosha ? <CircleAlert size={16} className="text-gold" /> : <CircleCheck size={16} className="text-green-600" />}
                {t("kaalSarpSadeSati.kaalSarpTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">
                {result.kaalSarp.hasDosha
                  ? t("kaalSarpSadeSati.kaalSarpFound", { type: result.kaalSarp.namedType ?? result.kaalSarp.type ?? "" })
                  : t("kaalSarpSadeSati.kaalSarpNotFound")}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{result.reading.kaalSarpExplanation}</p>
            </CardContent>
          </Card>

          <Card className={result.sadeSati.isActive ? "border-gold/30 bg-gold/5" : "border-primary/30 bg-primary/5"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                {result.sadeSati.isActive ? <CircleAlert size={16} className="text-gold" /> : <CircleCheck size={16} className="text-green-600" />}
                {t("kaalSarpSadeSati.sadeSatiTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">
                {result.sadeSati.isActive
                  ? t("kaalSarpSadeSati.sadeSatiActive", { phase: t(`kaalSarpSadeSati.phase.${result.sadeSati.phase}`) })
                  : t("kaalSarpSadeSati.sadeSatiNotActive")}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{result.reading.sadeSatiExplanation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("kaalSarpSadeSati.remedyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.reading.remedyNote}</p>
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
                <p className="text-sm font-medium">{t("kaalSarpSadeSati.detailedReportTitle")}</p>
                <p className="text-xs text-muted">{t("kaalSarpSadeSati.detailedReportDesc")}</p>
              </div>
              <Button asChild className="shrink-0">
                <Link href="/reports">
                  <FileText size={16} />
                  {t("kaalSarpSadeSati.getDetailedReport")}
                  {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-fit" onClick={() => setResult(null)}>
            {t("kaalSarpSadeSati.startOver")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
