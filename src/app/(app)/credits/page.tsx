"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useCheckout } from "@/lib/payments/use-checkout";

type CreditsSummary = { balance: number; freeQuestionsRemaining: number };
type PricingResponse = {
  creditPacks: { code: string; name: string; credits: number; priceInPaise: number }[];
  plans: { code: string; name: string; description: string; priceInPaise: number }[];
};

export default function CreditsPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const { checkout, loading } = useCheckout();

  const { data: summary } = useQuery({ queryKey: ["credits-summary"], queryFn: () => apiFetch<CreditsSummary>("/api/credits/summary") });
  const { data: pricing } = useQuery({ queryKey: ["public-pricing"], queryFn: () => apiFetch<PricingResponse>("/api/public/pricing") });

  const buy = (type: "credit_pack" | "subscription", code: string) => {
    checkout(
      { type, code },
      {
        onSuccess: () => toast({ title: t("payments.paymentSuccessTitle"), variant: "success" }),
        onError: (msg) => toast({ title: t("payments.paymentFailedTitle"), description: msg, variant: "danger" }),
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("nav.credits")}</h1>
      {summary && (
        <p className="mt-1 text-sm text-muted">
          {t("dashboard.creditsRemaining", { count: summary.balance })} · {t("dashboard.freeQuestionsRemaining", { count: summary.freeQuestionsRemaining })}
        </p>
      )}

      <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs text-gold">{t("payments.mockModeNotice")}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {pricing?.creditPacks.map((pack) => (
          <Card key={pack.code}>
            <CardHeader>
              <CardTitle>{pack.name}</CardTitle>
              <CardDescription>{pack.credits} AI questions</CardDescription>
            </CardHeader>
            <CardFooter className="justify-between">
              <span className="font-semibold text-gold">{formatInr(pack.priceInPaise, `${locale}-IN`)}</span>
              <Button size="sm" disabled={loading} onClick={() => buy("credit_pack", pack.code)}>{t("reports.buyNow")}</Button>
            </CardFooter>
          </Card>
        ))}
        {pricing?.plans.map((plan) => (
          <Card key={plan.code} className="border-gold/40">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardFooter className="justify-between">
              <span className="font-semibold text-gold">{formatInr(plan.priceInPaise, `${locale}-IN`)} {t("pricing.perMonth")}</span>
              <Button size="sm" disabled={loading} onClick={() => buy("subscription", plan.code)}>{t("reports.buyNow")}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
