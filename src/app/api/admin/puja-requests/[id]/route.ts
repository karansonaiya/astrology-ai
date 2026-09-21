import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({
  status: z.enum(["pending", "contacted", "scheduled", "completed", "cancelled"]),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin", "support_agent"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const existing = await prisma.pujaBookingRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const updated = await prisma.pujaBookingRequest.update({
      where: { id },
      data: { status: parsed.data.status, adminNotes: parsed.data.adminNotes },
    });

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: `admin.puja_request.${parsed.data.status}`, targetType: "PujaBookingRequest", targetId: id },
    });

    return NextResponse.json({ request: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
