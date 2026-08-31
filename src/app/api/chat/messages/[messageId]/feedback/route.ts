import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { feedbackSchema } from "@/lib/validations/chat";

export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const user = await requireUser();
    const { messageId } = await params;

    const message = await prisma.message.findFirst({
      where: { id: messageId, chat: { userId: user.id } },
    });
    if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const feedback = await prisma.messageFeedback.upsert({
      where: { messageId_userId: { messageId, userId: user.id } },
      update: { rating: parsed.data.rating },
      create: { messageId, userId: user.id, rating: parsed.data.rating },
    });

    return NextResponse.json({ feedback });
  } catch (err) {
    return errorResponse(err);
  }
}
