"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type CreateOrderResponse = {
  orderId: string;
  providerOrderId: string;
  amountInPaise: number;
  currency: string;
  label: string;
  mock: boolean;
  razorpayKeyId: string | null;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
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

      if (order.mock) {
        // Local/dev checkout: simulate an immediate successful charge.
        await apiFetch("/api/payments/verify", {
          method: "POST",
          body: JSON.stringify({
            orderId: order.orderId,
            razorpay_order_id: order.providerOrderId,
            razorpay_payment_id: `mock_pay_${order.orderId}`,
            razorpay_signature: "mock_signature",
          }),
        });
        invalidateAfterPurchase();
        opts?.onSuccess?.(order.orderId);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay || !order.razorpayKeyId) {
        opts?.onError?.("Could not load the payment checkout. Please try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: "Jyoti AI",
        description: order.label,
        order_id: order.providerOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({ orderId: order.orderId, ...response }),
            });
            invalidateAfterPurchase();
            opts?.onSuccess?.(order.orderId);
          } catch {
            opts?.onError?.("Payment verification failed. If money was deducted, it will be refunded automatically.");
          }
        },
        theme: { color: "#e8600f" },
      });
      rzp.open();
    } catch (err) {
      opts?.onError?.(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading };
}
