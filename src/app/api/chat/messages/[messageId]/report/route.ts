import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { reportSchema } from "@/lib/validations/chat";

export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireUser();
    const { messageId } = await params;

    const message = await prisma.message.findFirst({
      where: { id: messageId, chat: { userId: user.id } },
    });
    if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    await prisma.messageFeedback.upsert({
      where: { messageId_userId: { messageId, userId: user.id } },
      update: { rating: "not_helpful", reportReason: parsed.data.reason, reportedAt: new Date() },
      create: {
        messageId,
        userId: user.id,
        rating: "not_helpful",
        reportReason: parsed.data.reason,
        reportedAt: new Date(),
      },
    });

    await prisma.safetyFlag.create({
      data: { messageId, category: "other_policy_violation", severity: "medium", notes: parsed.data.reason },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
