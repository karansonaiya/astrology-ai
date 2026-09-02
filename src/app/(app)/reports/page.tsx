"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
type BirthProfile = { id: string };

export default function ReportsPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const { checkout, loading } = useCheckout();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  // Was an uncontrolled `defaultValue="store"` — after buying a report, the
  // toast said "payment successful" but the store tab stayed open with the
  // new purchase invisible on "My Reports" until the user thought to click
  // that tab themselves and it happened to have refetched. Controlled now
  // so a successful purchase can jump straight to where the report actually
  // shows up, and the query is refetched immediately rather than waiting on
  // whatever staleTime this page's queries have. Also seeded from ?tab= so
  // the report detail page's back button can deep-link straight to "My
  // Reports" instead of always landing back on the store.
  const [tab, setTab] = useState(() => (searchParams.get("tab") === "mine" ? "mine" : "store"));

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: Template[] }>("/api/reports/templates"),
  });
  // Found live: "Buy Now" never sent a birthProfileId at all, so every
  // report ever generated from this store used none of the person's real
  // birth data — entitlement.ts's generateReportContent silently falls back
  // to a fully generic report when birthProfileId is missing, with no error
  // to signal it (the report itself does say "Not included" under birth
  // details, but nothing before the purchase warns that it'll be generic).
  const { data: birthProfileData } = useQuery({
    queryKey: ["birth-profile"],
    queryFn: () => apiFetch<{ profile: BirthProfile | null; completeness: number }>("/api/birth-profile"),
  });
  const birthProfileId = birthProfileData?.profile?.id;
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => apiFetch<{ purchases: Purchase[] }>("/api/reports/my"),
    // Report generation (an AI call) finishes a few seconds after payment,
    // server-side, with no push mechanism — poll while anything's still
    // "pending" so status flips to "completed" (and the View Report button
    // appears) on its own instead of requiring a manual page refresh.
    refetchInterval: (query) => (query.state.data?.purchases.some((p) => p.status === "pending") ? 2000 : false),
  });

  const buy = (code: string) => {
    checkout(
      { type: "report", code, birthProfileId },
      {
        onSuccess: () => {
          toast({ title: t("payments.paymentSuccessTitle"), variant: "success" });
          qc.invalidateQueries({ queryKey: ["my-reports"] });
          qc.invalidateQueries({ queryKey: ["credits-summary"] });
          setTab("mine");
        },
        onError: (msg) => toast({ title: t("payments.paymentFailedTitle"), description: msg, variant: "danger" }),
      }
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="store">{t("reports.storeTitle")}</TabsTrigger>
          <TabsTrigger value="mine">{t("reports.myReportsTitle")}</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          {birthProfileData && !birthProfileData.profile && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs text-gold">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                {t("reports.noBirthProfileWarning")}{" "}
                <Link href="/profile" className="underline">{t("reports.addBirthProfileLink")}</Link>
              </span>
            </div>
          )}
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
