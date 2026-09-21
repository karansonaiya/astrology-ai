import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.enum(["gemstone", "rudraksha", "yantra", "other"]).optional(),
  priceInPaise: z.number().int().min(0).optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(["admin"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const existing = await prisma.spiritualProduct.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const product = await prisma.spiritualProduct.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ product });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(["admin"]);
    const { id } = await params;
    const existing = await prisma.spiritualProduct.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.spiritualProduct.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
