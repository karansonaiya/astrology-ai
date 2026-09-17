"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatInr, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Order = {
  id: string;
  type: string;
  status: string;
  amountInPaise: number;
  createdAt: string;
};

export default function PaymentsPage() {
  const t = useT();
  const { locale } = useI18n();

  const { data, isLoading } = useQuery({ queryKey: ["payments"], queryFn: () => apiFetch<{ orders: Order[] }>("/api/payments/orders") });

  const statusVariant = (status: string): "success" | "danger" | "default" =>
    status === "paid" ? "success" : status === "failed" ? "danger" : "default";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("payments.title")}</h1>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        {data?.orders.map((o) => (
          <Card key={o.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium capitalize">{o.type.replace("_", " ")}</p>
                <p className="text-xs text-muted">{formatDateTime(o.createdAt, `${locale}-IN`)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatInr(o.amountInPaise, `${locale}-IN`)}</span>
                <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && data?.orders.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("errors.notFound")}</p>}
      </div>
    </div>
  );
}
