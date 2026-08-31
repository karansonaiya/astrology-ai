import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { grantCredits } from "@/lib/credits";
import { CREDIT_PACKS } from "@/lib/pricing/catalog";

const patchSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const refund = await prisma.refundRequest.findUnique({ where: { id }, include: { order: true } });
    if (!refund) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (refund.status !== "pending") return NextResponse.json({ error: "already_processed" }, { status: 409 });

    await prisma.refundRequest.update({
      where: { id },
      data: {
        status: parsed.data.decision,
        adminNotes: parsed.data.adminNotes,
        processedBy: admin.id,
        processedAt: new Date(),
      },
    });

    if (parsed.data.decision === "approved") {
      await prisma.order.update({ where: { id: refund.orderId }, data: { status: "refunded" } });

      // Reverse the entitlement where it's simple/reversible (credit packs).
      // Reports and subscription entitlements are left to manual admin
      // follow-up since they may already have been consumed/read.
      if (refund.order.type === "credit_pack") {
        const pack = CREDIT_PACKS.find((p) => p.code === refund.order.relatedId);
        if (pack) {
          await grantCredits(refund.userId, -pack.credits, "refund", "Refund reversal", `order:${refund.order.id}`);
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: `admin.refund.${parsed.data.decision}`,
        targetType: "RefundRequest",
        targetId: id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
