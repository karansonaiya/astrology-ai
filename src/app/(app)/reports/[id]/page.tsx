"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { AiMarkdown } from "@/components/ui/ai-markdown";

type Purchase = {
  id: string;
  createdAt: string;
  template: { name: string };
  birthProfile: { birthDate: string; birthCity: string | null } | null;
  generatedContent: { body: string; generatedAt: string; birthDataUsed: boolean } | null;
};

export default function ReportDetailPage() {
  const t = useT();
  const { locale } = useI18n();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["report", params.id],
    queryFn: () => apiFetch<{ purchase: Purchase }>(`/api/reports/${params.id}`),
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><Skeleton className="h-96" /></div>;
  if (!data) return null;

  const { purchase } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link href="/reports?tab=mine" className="focus-ring mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={15} /> {t("common.back")}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{purchase.template.name}</h1>
        <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {t("reports.generatedOn", { date: formatDateTime(purchase.createdAt, `${locale}-IN`) })}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm text-muted">{t("reports.dataUsed")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {purchase.birthProfile ? (
            <>
              <Badge variant="success">{t("reports.dataIncluded")}</Badge>{" "}
              {formatDate(purchase.birthProfile.birthDate, `${locale}-IN`)} · {purchase.birthProfile.birthCity ?? "—"}
            </>
          ) : (
            <Badge>{t("reports.dataNotIncluded")}</Badge>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-5">
          {purchase.generatedContent?.body && <AiMarkdown content={purchase.generatedContent.body} className="text-foreground/90" />}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted">{t("reports.disclosure")}</p>

      <Button
        variant="outline"
        className="mt-4"
        onClick={() =>
          toast({
            title: t("reports.downloadPdf"),
            description: "PDF export isn't wired up in this environment yet — the report content above is the source of truth. See README §12.",
          })
        }
      >
        <Download size={14} /> {t("reports.downloadPdf")}
      </Button>
    </div>
  );
}
