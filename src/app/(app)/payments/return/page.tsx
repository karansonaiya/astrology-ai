"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
 *
 * Found live: this used to always land on this same generic "payment
 * successful" card with "Go to Payments" / "Go to dashboard" buttons,
 * regardless of what was actually bought — a report buyer had no way to
 * tell their report even existed without going and finding it themselves.
 * Now auto-redirects straight to the specific thing they bought (the
 * report itself, or the credits page) as soon as verification confirms it —
 * the manual buttons below stay only as a fallback if that redirect is
 * slow or the payment is still pending/failed.
 */
export default function PaymentReturnPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "error">(orderId ? "checking" : "error");

  useEffect(() => {
    if (!orderId) return;
    apiFetch<{ ok: boolean; type?: "credit_pack" | "report" | "subscription"; reportPurchaseId?: string }>(
      "/api/payments/verify",
      { method: "POST", body: JSON.stringify({ orderId }) }
    )
      .then((res) => {
        if (!res.ok) {
          setStatus("pending");
          return;
        }
        setStatus("paid");
        if (res.type === "report" && res.reportPurchaseId) {
          router.replace(`/reports/${res.reportPurchaseId}`);
        } else if (res.type === "credit_pack" || res.type === "subscription") {
          router.replace("/credits");
        }
        // Any other/unrecognized type: stay on this page — the manual
        // buttons below still work.
      })
      .catch(() => setStatus("error"));
  }, [orderId, router]);

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
