import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const onlyUnreviewed = searchParams.get("unreviewed") === "true";

    const flags = await prisma.safetyFlag.findMany({
      where: {
        category: category ? (category as never) : undefined,
        reviewed: onlyUnreviewed ? false : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { message: { include: { chat: { include: { user: { select: { name: true, email: true } } } } } } },
    });

    return NextResponse.json({ flags });
  } catch (err) {
    return errorResponse(err);
  }
}
