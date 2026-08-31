import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    const purchases = await prisma.reportPurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { template: true },
    });
    return NextResponse.json({ purchases });
  } catch (err) {
    return errorResponse(err);
  }
}
