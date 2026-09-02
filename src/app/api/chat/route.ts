import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { PERSONAS } from "@/lib/personas/catalog";

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

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // Optional — the persona-picker page (see src/lib/personas/catalog.ts)
    // sends this; the old zero-param "+ New chat" behavior still works with
    // no persona at all (personaCode stays null). Validated against the
    // known catalog codes rather than trusted as-is, same as any other
    // client-supplied catalog reference in this app (CREDIT_PACKS/report
    // template codes are similarly re-validated server-side).
    const body = await req.json().catch(() => null);
    const personaCode = typeof body?.personaCode === "string" && PERSONAS.some((p) => p.code === body.personaCode) ? body.personaCode : null;

    const chat = await prisma.chat.create({
      data: { userId: user.id, locale: (user.locale as "en" | "hi" | "gu") ?? "en", personaCode },
    });
    return NextResponse.json({ chat });
  } catch (err) {
    return errorResponse(err);
  }
}
