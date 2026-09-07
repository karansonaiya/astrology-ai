import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getEmailProvider } from "@/lib/notify/email";

const createTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(5).max(4000),
});

export async function GET() {
  try {
    const user = await requireUser();
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ tickets });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const ticket = await prisma.supportTicket.create({
      data: { userId: user.id, subject: parsed.data.subject, message: parsed.data.message },
    });

    const inbox = process.env.SUPPORT_INBOX_EMAIL;
    if (inbox) {
      try {
        await getEmailProvider().send(
          inbox,
          `New support ticket: ${parsed.data.subject}`,
          `From: ${user.email ?? "(no email on file)"} (userId: ${user.id})\n\n${parsed.data.message}`
        );
      } catch (err) {
        console.error("Failed to send support ticket notification email", err);
      }
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    return errorResponse(err);
  }
}
