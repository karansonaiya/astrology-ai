import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const inquiries = await prisma.productInquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
    });
    return NextResponse.json({ inquiries });
  } catch (err) {
    return errorResponse(err);
  }
}
