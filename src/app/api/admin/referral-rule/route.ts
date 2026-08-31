import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const patchSchema = z.object({
  triggerEvent: z.enum(["signup", "first_purchase"]),
  referrerReward: z.number().int().min(0),
  referredReward: z.number().int().min(0),
  active: z.boolean(),
});

export async function GET() {
  try {
    await requireAdmin(["admin"]);
    const rule = await prisma.referralRule.upsert({
      where: { key: "default" },
      update: {},
      create: { key: "default" },
    });
    return NextResponse.json({ rule });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(["admin"]);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const rule = await prisma.referralRule.upsert({
      where: { key: "default" },
      update: parsed.data,
      create: { key: "default", ...parsed.data },
    });

    return NextResponse.json({ rule });
  } catch (err) {
    return errorResponse(err);
  }
}
