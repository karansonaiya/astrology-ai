import crypto from "node:crypto";

/**
 * Payment provider abstraction. PAYMENT_PROVIDER=mock ships a fully working
 * local checkout with no external calls or real credentials — useful for
 * development and demos. Switch to "cashfree" and supply CASHFREE_* env vars
 * for real payments (Razorpay was tried earlier and removed in favor of
 * Cashfree — see git history if it's ever needed again).
 *
 * Cashfree's real flow doesn't hand the client a per-payment HMAC signature
 * the way Razorpay's did, so instead of "verify a client-supplied signature",
 * the shared contract here is "ask the provider directly whether an order is
 * paid" (fetchOrderStatus) — the client-side /api/payments/verify route uses
 * this as a fast optimistic check, and the webhook (source of truth) uses
 * verifyWebhookSignature + parseWebhookEvent independently either way.
 */

export type CreateOrderInput = {
  amountInPaise: number;
  currency: string;
  receipt: string; // our internal Order.id, used as the provider's order_id (idempotent)
  notes?: Record<string, string>;
  customer: { id: string; email?: string | null; phone?: string | null };
  returnUrl: string;
};

export type CreateOrderResult = {
  providerOrderId: string;
  raw: unknown;
  // Cashfree-only: the client SDK needs this to open the hosted checkout.
  // Absent for mock.
  paymentSessionId?: string;
};

export type WebhookEvent = {
  providerOrderId: string | null;
  eventId: string; // provider's event/payment id, for idempotency
  eventType: string;
  status: "paid" | "failed" | "other";
};

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  fetchOrderStatus(providerOrderId: string): Promise<{ paid: boolean; raw: unknown }>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}

// Thrown specifically when the provider's own gateway is unreachable/broken
// (confirmed live against Cashfree's real sandbox: an HTML error page from
// their APISIX/openresty gateway, not a JSON response from Cashfree's actual
// API) — distinct from a genuine Cashfree API rejection (a real JSON error
// body, e.g. a bad request), which is a different problem retrying won't
// fix and shouldn't be reported to the user as "temporarily unavailable".
export class PaymentGatewayUnavailableError extends Error {}

const CASHFREE_API_VERSION = "2023-08-01";

class CashfreePaymentProvider implements PaymentProvider {
  private appId: string;
  private secretKey: string;
  private webhookSecret?: string;
  private baseUrl: string;

  constructor() {
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secretKey) throw new Error("Cashfree credentials are not configured");
    this.appId = appId;
    this.secretKey = secretKey;
    this.webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    // CASHFREE_ENV="production" switches to the live API — defaults to
    // sandbox so a missing/misconfigured env var can never accidentally hit
    // production with test-mode assumptions.
    this.baseUrl = process.env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  }

  private headers() {
    return {
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      "x-api-version": CASHFREE_API_VERSION,
      "content-type": "application/json",
    };
  }

  // Found live: Cashfree's own sandbox gateway (APISIX/openresty) genuinely
  // returns an intermittent 502/503/504 with an HTML error page, not JSON —
  // reproduced directly against the real sandbox API more than once (a
  // couple of failures, then a clean success, no code change in between;
  // separately confirmed the exact request shape we send is NOT the
  // problem — the identical payload succeeds every time when retried a
  // moment later). Retrying with backoff rides out that kind of transient
  // gateway blip instead of surfacing it to the user as a failed payment.
  // `res.json()` on an HTML error body also throws its own confusing
  // "Unexpected token '<'" parse error — read as text first and only parse
  // if it looks like JSON, so a real outage logs a clear message instead of
  // a parse-error red herring.
  //
  // Also found live (separately from the above): plain `fetch` has no
  // built-in timeout — during the same instability, a request can just hang
  // with no response at all rather than failing fast with a 502/504, which
  // left the button spinning indefinitely with nothing to catch or retry.
  // AbortSignal.timeout() turns that into a real, catchable failure per
  // attempt instead of an unbounded hang.
  private static REQUEST_TIMEOUT_MS = 8_000;

  private async requestJson(url: string, init: RequestInit): Promise<{ status: number; data: Record<string, unknown> | null }> {
    const attempt = async () => {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(CashfreePaymentProvider.REQUEST_TIMEOUT_MS) });
      const text = await res.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      return { status: res.status, data, isJson: data !== null };
    };

    const delaysMs = [700, 1400];
    let result: Awaited<ReturnType<typeof attempt>> | null = null;
    let timedOut = false;
    for (let i = 0; i <= delaysMs.length; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, delaysMs[i - 1]));
      try {
        result = await attempt();
        timedOut = false;
        if (result.isJson || ![502, 503, 504].includes(result.status)) break;
      } catch (err) {
        // A timeout (or any network-level failure) is exactly as
        // retry-worthy as a 502/504 — same underlying "gateway isn't
        // responding" condition, just manifesting as a hang instead of a
        // fast error.
        timedOut = true;
        if (i === delaysMs.length) {
          throw new PaymentGatewayUnavailableError(
            `Cashfree's gateway did not respond in time (${err instanceof Error ? err.message : String(err)}) after retries — this is their infrastructure, not a request problem.`
          );
        }
      }
    }

    if (timedOut || !result || !result.isJson) {
      throw new PaymentGatewayUnavailableError(
        `Cashfree's gateway returned a non-JSON response (status ${result?.status}) after retries — this is their infrastructure, not a request problem (verified live: the identical request shape succeeds moments later).`
      );
    }
    return { status: result.status, data: result.data };
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { status, data } = await this.requestJson(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        order_id: input.receipt,
        // Cashfree's order_amount is in RUPEES (decimal), unlike Razorpay's
        // paise-based amount — our internal amountInPaise always divides by
        // 100 here. Confirmed against the real sandbox API, not just docs.
        order_amount: input.amountInPaise / 100,
        order_currency: input.currency,
        customer_details: {
          customer_id: input.customer.id,
          // customer_phone is mandatory on Cashfree's Orders API even for an
          // email-only account (this app allows signup with either) — a
          // clearly-fake placeholder is used when we have no real phone on
          // file, matching what Cashfree's own sandbox docs example uses.
          customer_phone: input.customer.phone ?? "9999999999",
          customer_email: input.customer.email ?? undefined,
        },
        order_meta: { return_url: input.returnUrl },
        order_note: input.notes ? JSON.stringify(input.notes) : undefined,
      }),
    });
    if (status < 200 || status >= 300) {
      throw new Error(`Cashfree createOrder failed (${status}): ${data?.message ?? JSON.stringify(data)}`);
    }
    return { providerOrderId: data!.order_id as string, paymentSessionId: data!.payment_session_id as string, raw: data };
  }

  async fetchOrderStatus(providerOrderId: string): Promise<{ paid: boolean; raw: unknown }> {
    const { status, data } = await this.requestJson(`${this.baseUrl}/orders/${encodeURIComponent(providerOrderId)}`, {
      headers: this.headers(),
    });
    if (status < 200 || status >= 300) {
      throw new Error(`Cashfree fetchOrderStatus failed (${status}): ${data?.message ?? JSON.stringify(data)}`);
    }
    return { paid: data!.order_status === "PAID", raw: data };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    if (!this.webhookSecret) throw new Error("CASHFREE_WEBHOOK_SECRET is not configured");
    const signature = headers.get("x-webhook-signature");
    const timestamp = headers.get("x-webhook-timestamp");
    if (!signature || !timestamp) return false;
    // Cashfree signs base64(HMAC-SHA256(timestamp + rawBody)), not a hex
    // digest of the body alone (that's Razorpay's scheme) — timestamp is
    // concatenated in front to prevent replay of an old, still-valid-looking body.
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(timestamp + rawBody).digest("base64");
    return timingSafeEqual(expected, signature);
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody) as {
      type?: string;
      data?: { order?: { order_id?: string }; payment?: { cf_payment_id?: string } };
    };
    const providerOrderId = payload.data?.order?.order_id ?? null;
    const eventId = payload.data?.payment?.cf_payment_id ?? `${payload.type}-${rawBody.length}`;
    let status: WebhookEvent["status"] = "other";
    if (payload.type === "PAYMENT_SUCCESS_WEBHOOK") status = "paid";
    else if (payload.type === "PAYMENT_FAILED_WEBHOOK" || payload.type === "PAYMENT_USER_DROPPED_WEBHOOK") status = "failed";
    return { providerOrderId, eventId, eventType: payload.type ?? "unknown", status };
  }
}

/** Local/dev provider — deterministic "success" flow, no network calls. */
class MockPaymentProvider implements PaymentProvider {
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const providerOrderId = `mock_order_${input.receipt}`;
    return { providerOrderId, raw: { id: providerOrderId, ...input } };
  }

  async fetchOrderStatus(): Promise<{ paid: boolean; raw: unknown }> {
    return { paid: true, raw: { status: "mock_paid" } };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    return { providerOrderId: null, eventId: `mock-${rawBody.length}`, eventType: "mock.event", status: "other" };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "cashfree" ? new CashfreePaymentProvider() : new MockPaymentProvider();
}
