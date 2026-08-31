import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    const chats = await prisma.chat.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, locale: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ chats });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const chat = await prisma.chat.create({
      data: { userId: user.id, locale: (user.locale as "en" | "hi" | "gu") ?? "en" },
    });
    return NextResponse.json({ chat });
  } catch (err) {
    return errorResponse(err);
  }
}
