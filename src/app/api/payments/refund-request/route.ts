import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { refundRequestSchema } from "@/lib/validations/payments";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = refundRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, userId: user.id, status: "paid" } });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const existing = await prisma.refundRequest.findFirst({ where: { orderId: order.id, status: "pending" } });
    if (existing) return NextResponse.json({ error: "already_requested" }, { status: 409 });

    const refund = await prisma.refundRequest.create({
      data: { orderId: order.id, userId: user.id, reason: parsed.data.reason },
    });

    return NextResponse.json({ refund });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { refundRequests: true },
    });
    return NextResponse.json({ orders });
  } catch (err) {
    return errorResponse(err);
  }
}
