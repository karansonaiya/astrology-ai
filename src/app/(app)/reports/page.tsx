"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatInr, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCheckout } from "@/lib/payments/use-checkout";

type Template = { id: string; code: string; name: string; description: string; priceInPaise: number };
type Purchase = { id: string; status: string; createdAt: string; template: { name: string } };

export default function ReportsPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const { checkout, loading } = useCheckout();

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: Template[] }>("/api/reports/templates"),
  });
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => apiFetch<{ purchases: Purchase[] }>("/api/reports/my"),
  });

  const buy = (code: string) => {
    checkout(
      { type: "report", code },
      {
        onSuccess: () => toast({ title: t("payments.paymentSuccessTitle"), variant: "success" }),
        onError: (msg) => toast({ title: t("payments.paymentFailedTitle"), description: msg, variant: "danger" }),
      }
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store">{t("reports.storeTitle")}</TabsTrigger>
          <TabsTrigger value="mine">{t("reports.myReportsTitle")}</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          {templatesLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {templates?.templates.map((tpl) => (
                <Card key={tpl.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <CardDescription>{tpl.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="justify-between">
                    <span className="font-semibold text-gold">{formatInr(tpl.priceInPaise, `${locale}-IN`)}</span>
                    <Button size="sm" disabled={loading} onClick={() => buy(tpl.code)}>{t("reports.buyNow")}</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {purchasesLoading ? (
            <Skeleton className="h-40" />
          ) : purchases?.purchases.length ? (
            <div className="flex flex-col gap-3">
              {purchases.purchases.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium">{p.template.name}</p>
                      <p className="text-xs text-muted">{t("reports.generatedOn", { date: formatDate(p.createdAt, `${locale}-IN`) })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={p.status === "completed" ? "success" : "default"}>{p.status}</Badge>
                      {p.status === "completed" && (
                        <Button asChild size="sm" variant="outline"><Link href={`/reports/${p.id}`}>{t("reports.viewReport")}</Link></Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted">{t("errors.notFound")}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
