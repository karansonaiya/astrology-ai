import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { verifyPaymentSchema } from "@/lib/validations/payments";
import { getPaymentProvider } from "@/lib/payments/provider";
import { fulfillOrder } from "@/lib/payments/entitlement";

/**
 * Client-side confirmation endpoint. This is a UX optimization only — the
 * webhook (see /api/payments/webhook) is the source of truth and will
 * independently verify + fulfil the order even if this call never happens
 * (e.g. the user closes the tab right after paying).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, userId: user.id } });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const provider = getPaymentProvider();
    const valid = provider.verifyPaymentSignature({
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });

    if (!valid) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "failed" } });
      return NextResponse.json({ error: "signature_invalid" }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        razorpayPaymentId: parsed.data.razorpay_payment_id,
        razorpaySignature: parsed.data.razorpay_signature,
      },
    });

    await prisma.paymentEvent.upsert({
      where: { provider_eventId: { provider: "client-verify", eventId: parsed.data.razorpay_payment_id } },
      update: {},
      create: {
        orderId: order.id,
        provider: "client-verify",
        eventId: parsed.data.razorpay_payment_id,
        eventType: "payment.verified",
        rawPayload: parsed.data,
        signatureVerified: true,
        processedAt: new Date(),
      },
    });

    await fulfillOrder(order.id);

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (err) {
    return errorResponse(err);
  }
}
