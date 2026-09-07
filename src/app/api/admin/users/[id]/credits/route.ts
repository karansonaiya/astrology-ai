import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { grantCredits } from "@/lib/credits";

// Capped generously above any real credit pack (largest is 10 credits, see
// CREDIT_PACKS) so a typo can't hand out an absurd amount by accident —
// this is a manual override for exactly the "AI didn't answer properly" /
// "used my last question for nothing" support-ticket case, not a bulk tool.
const bodySchema = z.object({
  amount: z.number().int().positive().max(100),
  reason: z.string().min(3).max(500),
});

/**
 * Support agents handling a "the AI didn't answer" / "my free question got
 * used up with no real reply" ticket need a way to make it right without
 * an admin needing to touch the database directly — this grants credits
 * the same way a real purchase would (grantCredits' "admin_adjust" type,
 * already modeled in credits.ts but never exposed anywhere until now).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin", "support_agent"]);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!targetUser) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const wallet = await grantCredits(id, parsed.data.amount, "admin_adjust", parsed.data.reason, `admin:${admin.id}`);

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "admin.user.grant_credits",
        targetType: "User",
        targetId: id,
        metadata: { amount: parsed.data.amount, reason: parsed.data.reason },
      },
    });

    return NextResponse.json({ wallet });
  } catch (err) {
    return errorResponse(err);
  }
}
