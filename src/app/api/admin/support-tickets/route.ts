import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true, phone: true } }, replies: true },
    });
    return NextResponse.json({ tickets });
  } catch (err) {
    return errorResponse(err);
  }
}
