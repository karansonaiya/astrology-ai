import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/provider";
import { fulfillOrder } from "@/lib/payments/entitlement";

/**
 * Cashfree webhook — the source of truth for payment state. Independently
 * verifies the signature (never trusts the client), and is idempotent via
 * the unique (provider, eventId) constraint on PaymentEvent, so Cashfree's
 * at-least-once delivery can safely retry.
 *
 * Payload parsing + signature verification are provider-specific (Cashfree's
 * signature covers timestamp+body and is base64, not the hex-of-body-only
 * scheme Razorpay used) — both live behind PaymentProvider so this route
 * itself has no provider-specific knowledge.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Everything below is wrapped in one try/catch — getPaymentProvider()
  // itself throws if PAYMENT_PROVIDER=cashfree but CASHFREE_APP_ID/
  // CASHFREE_SECRET_KEY aren't set, and that call used to sit *outside* any
  // try/catch here. Found live: that produced an unhandled exception on
  // Netlify with an opaque, empty-body 500 (no {error: "..."} at all) —
  // instead of the deliberate webhook_not_configured response below.
  try {
    const provider = getPaymentProvider();

    let signatureValid: boolean;
    try {
      signatureValid = provider.verifyWebhookSignature(rawBody, req.headers);
    } catch (err) {
      console.error("[webhook] verification error", err);
      return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
    }

    if (!signatureValid) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }

    const event = provider.parseWebhookEvent(rawBody);
    const order = event.providerOrderId ? await prisma.order.findUnique({ where: { providerOrderId: event.providerOrderId } }) : null;

    try {
      await prisma.paymentEvent.create({
        data: {
          orderId: order?.id,
          provider: "cashfree",
          eventId: event.eventId,
          eventType: event.eventType,
          rawPayload: JSON.parse(rawBody),
          signatureVerified: true,
          processedAt: new Date(),
        },
      });
    } catch (err: unknown) {
      // Unique constraint violation => we've already processed this exact
      // event (Cashfree retried delivery). Acknowledge and stop — idempotency.
      if ((err as { code?: string })?.code === "P2002") {
        return NextResponse.json({ ok: true, deduped: true });
      }
      throw err;
    }

    if (order && event.status === "paid") {
      await fulfillOrder(order.id);
    }

    if (order && event.status === "failed") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "failed" } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] unhandled error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
