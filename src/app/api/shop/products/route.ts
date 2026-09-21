import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/auth/guard";

// Public catalog — active products only. Deliberately no auth requirement:
// browsing the shop shouldn't need an account, same as the marketing
// pricing page.
export async function GET() {
  try {
    const products = await prisma.spiritualProduct.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  } catch (err) {
    return errorResponse(err);
  }
}
