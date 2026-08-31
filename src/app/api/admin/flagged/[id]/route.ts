import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({ notes: z.string().max(1000).optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin", "support_agent"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const flag = await prisma.safetyFlag.update({
      where: { id },
      data: { reviewed: true, reviewerId: admin.id, notes: parsed.data.notes },
    });

    return NextResponse.json({ flag });
  } catch (err) {
    return errorResponse(err);
  }
}
