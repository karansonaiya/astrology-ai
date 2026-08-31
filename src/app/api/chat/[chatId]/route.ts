import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const user = await requireUser();
    const { chatId } = await params;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { feedback: { where: { userId: user.id } } },
        },
      },
    });

    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ chat });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const user = await requireUser();
    const { chatId } = await params;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: user.id } });
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.chat.update({ where: { id: chatId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
