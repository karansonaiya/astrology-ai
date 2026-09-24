import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["user", "admin", "support_agent", "content_editor"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    // Found in a full audit: the admin/users page's Suspend/Reactivate
    // button is shown to (and its GET/credits endpoints already allow)
    // support_agent, but this route required plain "admin" for any PATCH —
    // a support_agent clicking Suspend got a silent 403. Role changes stay
    // admin-only (a support_agent granting themselves/anyone "admin" would
    // be a real privilege escalation); status-only changes (suspend/
    // reactivate) don't touch role at all, so they're safe to allow.
    const admin = await requireAdmin(parsed.data.role !== undefined ? ["admin"] : ["admin", "support_agent"]);
    const { id } = await params;

    const user = await prisma.user.update({ where: { id }, data: parsed.data });

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "admin.user.update", targetType: "User", targetId: id, metadata: parsed.data },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin"]);
    const { id } = await params;

    await prisma.user.update({
      where: { id },
      data: { status: "deleted", deletedAt: new Date(), email: null, phone: null },
    });

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "admin.user.delete", targetType: "User", targetId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
