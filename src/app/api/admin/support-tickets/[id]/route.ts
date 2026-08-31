import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({
  reply: z.string().max(4000).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  assignedTo: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin", "support_agent"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    if (parsed.data.reply) {
      await prisma.supportTicketReply.create({
        data: { ticketId: id, authorId: admin.id, message: parsed.data.reply },
      });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: parsed.data.status,
        assignedTo: parsed.data.assignedTo ?? (parsed.data.reply ? admin.id : undefined),
      },
      include: { replies: true },
    });

    return NextResponse.json({ ticket });
  } catch (err) {
    return errorResponse(err);
  }
}
