import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { getEmailProvider } from "@/lib/notify/email";

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

    if (parsed.data.reply) {
      try {
        const owner = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { email: true } });
        if (owner?.email) {
          await getEmailProvider().send(
            owner.email,
            `You have a reply on your support ticket: ${ticket.subject}`,
            `An admin replied to your support ticket "${ticket.subject}":\n\n${parsed.data.reply}\n\nLog in to view the full conversation.`
          );
        }
      } catch (err) {
        console.error("Failed to send support ticket reply notification email", err);
      }
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    return errorResponse(err);
  }
}
