import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    // Explicit select, not `include` — see reports/[id]/route.ts's comment:
    // the photoData Bytes column must never be serialized into a JSON list.
    const purchases = await prisma.reportPurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        template: { select: { name: true } },
      },
    });
    return NextResponse.json({ purchases });
  } catch (err) {
    return errorResponse(err);
  }
}
