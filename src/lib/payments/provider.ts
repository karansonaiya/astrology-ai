import crypto from "node:crypto";
import Razorpay from "razorpay";

/**
 * Payment provider abstraction. PAYMENT_PROVIDER=mock ships a fully working
 * local checkout with no external calls or real credentials — useful for
 * development and demos. Switch to "razorpay" and supply RAZORPAY_* env vars
 * for real payments. A Stripe adapter can be added later behind the same
 * interface for international expansion.
 */

export type CreateOrderInput = {
  amountInPaise: number;
  currency: string;
  receipt: string; // our internal Order.id, used as the idempotent receipt
  notes?: Record<string, string>;
};

export type CreateOrderResult = {
  providerOrderId: string;
  raw: unknown;
};

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}

class RazorpayPaymentProvider implements PaymentProvider {
  private client: Razorpay;

  constructor() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error("Razorpay credentials are not configured");
    this.client = new Razorpay({ key_id, key_secret });
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const order = await this.client.orders.create({
      amount: input.amountInPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
    return { providerOrderId: order.id, raw: order };
  }

  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    return timingSafeEqual(expected, input.signature);
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return timingSafeEqual(expected, signatureHeader);
  }
}

/** Local/dev provider — deterministic "success" flow, no network calls. */
class MockPaymentProvider implements PaymentProvider {
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const providerOrderId = `mock_order_${input.receipt}`;
    return { providerOrderId, raw: { id: providerOrderId, ...input } };
  }

  verifyPaymentSignature(): boolean {
    // The mock checkout UI only ever calls verify after a simulated
    // successful charge, so signature checking is a no-op here.
    return true;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "razorpay" ? new RazorpayPaymentProvider() : new MockPaymentProvider();
}
