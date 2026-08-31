"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatInr, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type Order = {
  id: string;
  type: string;
  status: string;
  amountInPaise: number;
  createdAt: string;
  refundRequests: { status: string }[];
};

export default function PaymentsPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data } = useQuery({ queryKey: ["payments"], queryFn: () => apiFetch<{ orders: Order[] }>("/api/payments/refund-request") });

  const requestRefund = useMutation({
    mutationFn: () => apiFetch("/api/payments/refund-request", { method: "POST", body: JSON.stringify({ orderId: refundTarget, reason }) }),
    onSuccess: () => {
      toast({ title: t("payments.refundSubmitted"), variant: "success" });
      qc.invalidateQueries({ queryKey: ["payments"] });
      setRefundTarget(null);
      setReason("");
    },
  });

  const statusVariant = (status: string): "success" | "danger" | "gold" | "default" =>
    status === "paid" ? "success" : status === "failed" ? "danger" : status === "refunded" ? "gold" : "default";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("payments.title")}</h1>

      <div className="mt-6 flex flex-col gap-3">
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
                {o.status === "paid" && o.refundRequests.length === 0 && (
                  <Button size="sm" variant="outline" onClick={() => setRefundTarget(o.id)}>
                    {t("payments.requestRefund")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data?.orders.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("errors.notFound")}</p>}
      </div>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payments.requestRefund")}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder={t("payments.refundReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button className="mt-4 w-full" disabled={reason.length < 5} onClick={() => requestRefund.mutate()}>
            {t("common.submit")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
