import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { createOrderSchema } from "@/lib/validations/payments";
import { getPaymentProvider } from "@/lib/payments/provider";
import { CREDIT_PACKS } from "@/lib/pricing/catalog";
import { rateLimit } from "@/lib/rate-limit";

async function resolvePrice(type: string, code: string) {
  if (type === "credit_pack") {
    const pack = CREDIT_PACKS.find((p) => p.code === code);
    return pack ? { amountInPaise: pack.priceInPaise, label: pack.name } : null;
  }
  if (type === "report") {
    const template = await prisma.reportTemplate.findUnique({ where: { code } });
    return template && template.active ? { amountInPaise: template.priceInPaise, label: template.name, id: template.id } : null;
  }
  if (type === "subscription") {
    const plan = await prisma.plan.findUnique({ where: { code } });
    return plan && plan.active ? { amountInPaise: plan.priceInPaise, label: plan.name, id: plan.id } : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const rl = await rateLimit("create-order", user.id, 20, 600);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const priced = await resolvePrice(parsed.data.type, parsed.data.code);
    if (!priced) return NextResponse.json({ error: "unknown_product" }, { status: 404 });

    const idempotencyKey = `${user.id}:${parsed.data.type}:${parsed.data.code}:${nanoid(10)}`;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type: parsed.data.type,
        amountInPaise: priced.amountInPaise,
        currency: "INR",
        status: "created",
        idempotencyKey,
        relatedId: parsed.data.code,
      },
    });

    if (parsed.data.type === "report") {
      // Security: birthProfileId comes from the client — without this
      // ownership check, one user could pay for a cheap report while
      // supplying another user's birthProfileId, and generateReportContent
      // (entitlement.ts) would compute + hand back that victim's real
      // birth date/time/place and chart inside the attacker's own
      // ReportPurchase (readable via GET /api/reports/[id]). Found in
      // security review — verified exploitable, fixed here.
      if (parsed.data.birthProfileId) {
        const owned = await prisma.birthProfile.findFirst({
          where: { id: parsed.data.birthProfileId, userId: user.id },
          select: { id: true },
        });
        if (!owned) return NextResponse.json({ error: "invalid_birth_profile" }, { status: 403 });
      }

      await prisma.reportPurchase.create({
        data: {
          userId: user.id,
          templateId: (priced as { id: string }).id,
          birthProfileId: parsed.data.birthProfileId,
          orderId: order.id,
          status: "pending",
        },
      });
    }

    const provider = getPaymentProvider();
    const { providerOrderId } = await provider.createOrder({
      amountInPaise: priced.amountInPaise,
      currency: "INR",
      receipt: order.id,
      notes: { userId: user.id, type: parsed.data.type, code: parsed.data.code },
    });

    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: providerOrderId } });

    return NextResponse.json({
      orderId: order.id,
      providerOrderId,
      amountInPaise: priced.amountInPaise,
      currency: "INR",
      label: priced.label,
      mock: process.env.PAYMENT_PROVIDER !== "razorpay",
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
