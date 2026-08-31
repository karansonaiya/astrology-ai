import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

const upsertSchema = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean(),
  description: z.string().max(300).optional(),
});

export async function GET() {
  try {
    await requireAdmin(["admin"]);
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ flags });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["admin"]);
    const body = await req.json().catch(() => null);
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const flag = await prisma.featureFlag.upsert({
      where: { key: parsed.data.key },
      update: { enabled: parsed.data.enabled, description: parsed.data.description, updatedBy: admin.id },
      create: { ...parsed.data, updatedBy: admin.id },
    });

    return NextResponse.json({ flag });
  } catch (err) {
    return errorResponse(err);
  }
}
