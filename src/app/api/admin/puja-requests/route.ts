import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const requests = await prisma.pujaBookingRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
    return NextResponse.json({ requests });
  } catch (err) {
    return errorResponse(err);
  }
}
