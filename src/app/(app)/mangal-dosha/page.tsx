"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flame, Sparkles, FileText, CircleCheck, CircleAlert } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { useToast } from "@/components/ui/toast";
import { MANGAL_DOSHA_REPORT_CODES } from "@/lib/pricing/catalog";

type ReportTemplate = { code: string; priceInPaise: number };
type MangalDosha = {
  hasDosha: boolean;
  severity: string | null;
  description: string | null;
  hasException: boolean;
  exceptions: string[];
  remedies: string[];
};
type MangalDoshaReading = { title: string; explanation: string; exceptionNote: string | null; remedyNote: string; summary: string };
type Result = { mangalDosha: MangalDosha; reading: MangalDoshaReading };

export default function MangalDoshaPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const [result, setResult] = useState<Result | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);
  const [noProfile, setNoProfile] = useState(false);
  const [birthTimeRequired, setBirthTimeRequired] = useState(false);

  const generate = useMutation({
    mutationFn: () => apiFetch<Result>("/api/mangal-dosha", { method: "POST" }),
    onSuccess: (res) => setResult(res),
    // Found in an audit: a genuine 500 (e.g. the AI reading step throwing on
    // malformed JSON) fell through all three branches here with zero
    // feedback — added a generic fallback, matching gemstone/face-reading.
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else if (err instanceof ApiError && err.status === 422 && (err.body as { error?: string } | null)?.error === "birth_time_required") {
        setBirthTimeRequired(true);
      } else if (err instanceof ApiError && err.status === 422) setNoProfile(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  const { data: templatesData } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: ReportTemplate[] }>("/api/reports/templates"),
  });
  const detailedReportPrice = templatesData?.templates.find((tp) => MANGAL_DOSHA_REPORT_CODES.has(tp.code))?.priceInPaise;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Flame size={22} className="text-primary" /> {t("mangalDosha.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("mangalDosha.subtitle")}</p>

      {noProfile && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">{t("mangalDosha.noProfileNotice")}</p>
            <Button asChild><Link href="/profile">{t("common.edit")}</Link></Button>
          </CardContent>
        </Card>
      )}

      {birthTimeRequired && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">{t("mangalDosha.birthTimeRequiredNotice")}</p>
            <Button asChild><Link href="/profile">{t("common.edit")}</Link></Button>
          </CardContent>
        </Card>
      )}

      {!result && !noProfile && !birthTimeRequired && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-muted">{t("mangalDosha.hint")}</p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles size={16} />
              {generate.isPending ? t("mangalDosha.generating") : t("mangalDosha.generate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {generate.isPending && <Skeleton className="mt-4 h-40" />}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <Card className={result.mangalDosha.hasDosha ? "border-gold/30 bg-gold/5" : "border-primary/30 bg-primary/5"}>
            <CardContent className="py-4">
              <div className="mb-2">
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
              </div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {result.mangalDosha.hasDosha ? (
                  <CircleAlert size={16} className="text-gold" />
                ) : (
                  <CircleCheck size={16} className="text-green-600" />
                )}
                {result.mangalDosha.hasDosha
                  ? t("mangalDosha.realDataLineFound", { severity: result.mangalDosha.severity ?? "" })
                  : t("mangalDosha.realDataLineNotFound")}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{result.reading.explanation}</p>
            </CardContent>
          </Card>

          {result.reading.exceptionNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("mangalDosha.exceptionTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.reading.exceptionNote}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("mangalDosha.remedyTitle")}</CardTitle>
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
                <p className="text-sm font-medium">{t("mangalDosha.detailedReportTitle")}</p>
                <p className="text-xs text-muted">{t("mangalDosha.detailedReportDesc")}</p>
              </div>
              <Button asChild className="shrink-0">
                <Link href="/reports">
                  <FileText size={16} />
                  {t("mangalDosha.getDetailedReport")}
                  {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-fit" onClick={() => setResult(null)}>
            {t("mangalDosha.startOver")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
