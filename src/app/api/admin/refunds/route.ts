import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const refunds = await prisma.refundRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: true, user: { select: { name: true, email: true, phone: true } } },
    });
    return NextResponse.json({ refunds });
  } catch (err) {
    return errorResponse(err);
  }
}
