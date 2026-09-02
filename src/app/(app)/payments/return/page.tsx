"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

/**
 * Cashfree's return_url — reached when a payment method needs a full-page
 * redirect (UPI app switch, netbanking OTP, etc.) rather than staying inside
 * the in-page checkout modal. This is a fresh page load (no prior React
 * state survives the round trip), so it re-derives everything from
 * ?order_id= and re-asks our own server, which independently re-asks
 * Cashfree — never trusts anything the redirect itself claims.
 */
export default function PaymentReturnPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "error">(orderId ? "checking" : "error");

  useEffect(() => {
    if (!orderId) return;
    apiFetch<{ ok: boolean }>("/api/payments/verify", { method: "POST", body: JSON.stringify({ orderId }) })
      .then((res) => setStatus(res.ok ? "paid" : "pending"))
      .catch(() => setStatus("error"));
  }, [orderId]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center md:px-6">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          {status === "checking" && (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted">{t("payments.returnVerifying")}</p>
            </>
          )}
          {status === "paid" && (
            <>
              <CheckCircle2 size={40} className="text-success" />
              <h1 className="font-heading text-lg font-semibold">{t("payments.paymentSuccessTitle")}</h1>
              <p className="text-sm text-muted">{t("payments.returnSuccessDesc")}</p>
            </>
          )}
          {status === "pending" && (
            <>
              <Clock size={40} className="text-gold" />
              <h1 className="font-heading text-lg font-semibold">{t("payments.returnPendingTitle")}</h1>
              <p className="text-sm text-muted">{t("payments.returnPendingDesc")}</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle size={40} className="text-danger" />
              <h1 className="font-heading text-lg font-semibold">{t("payments.paymentFailedTitle")}</h1>
            </>
          )}

          <div className="mt-4 flex gap-2">
            <Link href="/payments"><Button variant="outline">{t("payments.backToPayments")}</Button></Link>
            <Link href="/dashboard"><Button>{t("payments.backToDashboard")}</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
