import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const createSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  category: z.enum(["gemstone", "rudraksha", "yantra", "other"]),
  priceInPaise: z.number().int().min(1),
  imageUrl: z.string().url().max(500).optional(),
});

export async function GET() {
  try {
    await requireAdmin(["admin"]);
    const products = await prisma.spiritualProduct.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ products });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(["admin"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const product = await prisma.spiritualProduct.create({ data: parsed.data });
    return NextResponse.json({ product });
  } catch (err) {
    return errorResponse(err);
  }
}
