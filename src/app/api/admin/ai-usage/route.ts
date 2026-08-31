import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin"]);

    const [byFeature, byProvider, recent] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ["feature"],
        _count: true,
        _sum: { costEstimateUsd: true, promptTokens: true, completionTokens: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["provider", "model"],
        _count: true,
        _sum: { costEstimateUsd: true },
      }),
      prisma.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    ]);

    return NextResponse.json({ byFeature, byProvider, recent });
  } catch (err) {
    return errorResponse(err);
  }
}
