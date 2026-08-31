import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        locale: true,
        createdAt: true,
        _count: { select: { orders: true, chats: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (err) {
    return errorResponse(err);
  }
}
