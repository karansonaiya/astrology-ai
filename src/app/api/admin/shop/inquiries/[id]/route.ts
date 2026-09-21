import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const existing = await prisma.productInquiry.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const inquiry = await prisma.productInquiry.update({ where: { id }, data: { status: parsed.data.status } });
    return NextResponse.json({ inquiry });
  } catch (err) {
    return errorResponse(err);
  }
}
