import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const request = await prisma.compatibilityRequest.findFirst({ where: { id, userId: user.id } });
    if (!request) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.compatibilityRequest.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
