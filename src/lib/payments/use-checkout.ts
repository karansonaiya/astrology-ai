"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget: "_modal" }) => Promise<{ error?: unknown; paymentDetails?: unknown }>;
    };
  }
}

type CreateOrderResponse = {
  orderId: string;
  providerOrderId: string;
  amountInPaise: number;
  currency: string;
  label: string;
  provider: "mock" | "cashfree";
  paymentSessionId: string | null;
  cashfreeMode: "sandbox" | "production";
};

function loadCashfreeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Cashfree) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const invalidateAfterPurchase = () => {
    qc.invalidateQueries({ queryKey: ["credits-summary"] });
    qc.invalidateQueries({ queryKey: ["my-reports"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
  };

  // After checkout closes (mock's simulated instant success, or Cashfree's
  // modal resolving), ask our own server to confirm — it independently asks
  // Cashfree's order-status API rather than trusting anything the client says.
  const confirm = async (orderId: string, opts?: { onSuccess?: (orderId: string) => void; onError?: (message: string) => void }) => {
    try {
      const result = await apiFetch<{ ok: boolean }>("/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      if (result.ok) {
        invalidateAfterPurchase();
        opts?.onSuccess?.(orderId);
      } else {
        opts?.onError?.("Payment is still pending. If money was deducted, it will be confirmed automatically shortly.");
      }
    } catch {
      opts?.onError?.("Payment verification failed. If money was deducted, it will be refunded automatically.");
    }
  };

  const checkout = async (
    input: { type: "credit_pack" | "report" | "subscription"; code: string; birthProfileId?: string },
    opts?: { onSuccess?: (orderId: string) => void; onError?: (message: string) => void }
  ) => {
    setLoading(true);
    try {
      const order = await apiFetch<CreateOrderResponse>("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify(input),
      });

      if (order.provider === "mock") {
        // Local/dev checkout: simulate an immediate successful charge.
        await confirm(order.orderId, opts);
        return;
      }

      if (!order.paymentSessionId) {
        opts?.onError?.("Could not start the payment. Please try again.");
        return;
      }

      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded || !window.Cashfree) {
        opts?.onError?.("Could not load the payment checkout. Please try again.");
        return;
      }

      const cashfree = window.Cashfree({ mode: order.cashfreeMode });
      const result = await cashfree.checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_modal" });
      if (result.error) {
        // User closed the modal or the payment failed client-side — the
        // webhook will still catch a real charge if one somehow went through,
        // but there's nothing to optimistically confirm here.
        opts?.onError?.("Payment was not completed.");
        return;
      }
      await confirm(order.orderId, opts);
    } catch (err) {
      opts?.onError?.(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading };
}
