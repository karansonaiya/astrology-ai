import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
    return NextResponse.json({ orders });
  } catch (err) {
    return errorResponse(err);
  }
}
