import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const upsertSchema = z.object({
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  priceInPaise: z.number().int().min(0),
  billingPeriod: z.string().default("monthly"),
  creditsGranted: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAdmin(["admin"]);
    const plans = await prisma.plan.findMany();
    return NextResponse.json({ plans });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(["admin"]);
    const body = await req.json().catch(() => null);
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const plan = await prisma.plan.upsert({ where: { code: parsed.data.code }, update: parsed.data, create: parsed.data });
    return NextResponse.json({ plan });
  } catch (err) {
    return errorResponse(err);
  }
}
