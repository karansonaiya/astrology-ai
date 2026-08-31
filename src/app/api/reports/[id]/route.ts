import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const purchase = await prisma.reportPurchase.findFirst({
      where: { id, userId: user.id },
      include: { template: true, birthProfile: true },
    });
    if (!purchase) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ purchase });
  } catch (err) {
    return errorResponse(err);
  }
}
