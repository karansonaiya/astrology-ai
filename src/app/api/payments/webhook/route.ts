import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/provider";
import { fulfillOrder } from "@/lib/payments/entitlement";

/**
 * Razorpay webhook — the source of truth for payment state. Independently
 * verifies the signature (never trusts the client), and is idempotent via
 * the unique (provider, eventId) constraint on PaymentEvent, so Razorpay's
 * at-least-once delivery can safely retry.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  const provider = getPaymentProvider();
  let signatureValid: boolean;
  try {
    signatureValid = provider.verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("[webhook] verification error", err);
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  if (!signatureValid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };

  const eventId = payload.payload?.payment?.entity?.id ?? `${payload.event}-${rawBody.length}`;
  const razorpayOrderId = payload.payload?.payment?.entity?.order_id;

  const order = razorpayOrderId ? await prisma.order.findUnique({ where: { razorpayOrderId } }) : null;

  try {
    await prisma.paymentEvent.create({
      data: {
        orderId: order?.id,
        provider: "razorpay",
        eventId,
        eventType: payload.event,
        rawPayload: payload as unknown as object,
        signatureVerified: true,
        processedAt: new Date(),
      },
    });
  } catch (err: unknown) {
    // Unique constraint violation => we've already processed this exact
    // event (Razorpay retried delivery). Acknowledge and stop — idempotency.
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ ok: true, deduped: true });
    }
    throw err;
  }

  if (order && (payload.event === "payment.captured" || payload.event === "order.paid")) {
    await fulfillOrder(order.id);
  }

  if (order && payload.event === "payment.failed") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "failed" } });
  }

  return NextResponse.json({ ok: true });
}
