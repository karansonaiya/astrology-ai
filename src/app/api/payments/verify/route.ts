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
 *
 * Unlike Razorpay's old flow (which trusted a client-supplied order_id/
 * payment_id/signature triple), Cashfree hands the client no signed proof of
 * payment at all — so this never trusts anything the client says about
 * payment status. It only trusts our own DB's providerOrderId (set at
 * create-order time, before checkout ever opened) and asks the provider's
 * own order-status API directly.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, userId: user.id } });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!order.providerOrderId) return NextResponse.json({ error: "no_provider_order" }, { status: 400 });

    const provider = getPaymentProvider();
    const { paid, raw } = await provider.fetchOrderStatus(order.providerOrderId);

    if (!paid) {
      return NextResponse.json({ ok: false, status: "pending" });
    }

    await prisma.paymentEvent.upsert({
      where: { provider_eventId: { provider: "client-verify", eventId: order.providerOrderId } },
      update: {},
      create: {
        orderId: order.id,
        provider: "client-verify",
        eventId: order.providerOrderId,
        eventType: "payment.verified",
        rawPayload: raw as object,
        signatureVerified: true,
        processedAt: new Date(),
      },
    });

    await fulfillOrder(order.id);

    // Found live: every caller (the in-modal checkout flow AND Cashfree's
    // full-page return_url redirect for UPI/netbanking) only ever got
    // {ok, orderId} back, which isn't enough to send the customer straight
    // to what they actually bought — every path was landing on a generic
    // "Payments"/dashboard page regardless of purchase type, so a report
    // buyer had no idea their report even existed until they went and
    // clicked around to find it themselves. reportPurchaseId lets both
    // callers route directly to /reports/[id] instead.
    const reportPurchase =
      order.type === "report" ? await prisma.reportPurchase.findUnique({ where: { orderId: order.id }, select: { id: true } }) : null;

    return NextResponse.json({ ok: true, orderId: order.id, type: order.type, reportPurchaseId: reportPurchase?.id });
  } catch (err) {
    return errorResponse(err);
  }
}
