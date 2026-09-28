"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionBadge } from "@/components/marketing/section-badge";

type PricingResponse = {
  freeQuestionsCap: number;
  creditPacks: { code: string; name: string; credits: number; priceInPaise: number }[];
  templates: { code: string; name: string; description: string; priceInPaise: number }[];
  plans: { code: string; name: string; description: string; priceInPaise: number; billingPeriod: string }[];
};

export function PricingContent() {
  const t = useT();
  const { locale } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: () => apiFetch<PricingResponse>("/api/public/pricing"),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <div className="text-center">
        <SectionBadge>{t("landing.pricingEyebrow")}</SectionBadge>
        <h1 className="mt-4 font-heading text-3xl font-semibold md:text-4xl">{t("pricing.title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("pricing.taxesNotice")}</p>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle>{t("pricing.freeQuestions")}</CardTitle>
                <p className="mt-1 font-heading text-2xl font-semibold text-foreground">{formatInr(0, `${locale}-IN`)}</p>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                {data?.freeQuestionsCap ?? 3} {t("common.free").toLowerCase()} — {t("common.aiGeneratedGuidance")}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full"><Link href="/login">{t("common.getStarted")}</Link></Button>
              </CardFooter>
            </Card>

            {data?.creditPacks.map((pack) => (
              <Card key={pack.code}>
                <CardHeader>
                  <CardTitle>{pack.name}</CardTitle>
                  <p className="mt-1 font-heading text-2xl font-semibold text-foreground">{formatInr(pack.priceInPaise, `${locale}-IN`)}</p>
                </CardHeader>
                <CardContent className="text-sm text-muted">{pack.credits} AI questions</CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full"><Link href="/credits">{t("reports.buyNow")}</Link></Button>
                </CardFooter>
              </Card>
            ))}

            {data?.plans.map((plan) => (
              <Card key={plan.code} className="border-gold/40">
                <CardHeader>
                  <Badge variant="gold" className="mb-1 w-fit">{t("pricing.perMonth")}</Badge>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
                    {formatInr(plan.priceInPaise, `${locale}-IN`)}
                  </p>
                </CardHeader>
                <CardContent className="text-sm text-muted">{plan.description}</CardContent>
                <CardFooter>
                  <Button asChild className="w-full"><Link href="/credits">{t("reports.buyNow")}</Link></Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <h2 className="mt-16 font-heading text-2xl font-semibold">{t("nav.reports")}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data?.templates.map((tpl) => (
              <Card key={tpl.code}>
                <CardHeader>
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  <CardDescription>{tpl.description}</CardDescription>
                </CardHeader>
                <CardFooter className="justify-between">
                  <span className="text-sm font-semibold text-gold">{formatInr(tpl.priceInPaise, `${locale}-IN`)}</span>
                  <Button asChild size="sm" variant="outline"><Link href="/reports">{t("reports.buyNow")}</Link></Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
        <Check size={14} className="text-success" />
        {t("pricing.noRefundsNotice")}
      </div>
    </div>
  );
}
