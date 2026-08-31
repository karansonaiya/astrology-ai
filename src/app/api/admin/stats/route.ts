import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent", "content_editor"]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers30d,
      paidOrders,
      totalRevenue,
      pendingRefunds,
      aiUsage30d,
      flaggedUnreviewed,
      localeBreakdown,
      recentTickets,
    ] = await Promise.all([
      prisma.user.count({ where: { status: { not: "deleted" } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.order.count({ where: { status: "paid" } }),
      prisma.order.aggregate({ where: { status: "paid" }, _sum: { amountInPaise: true } }),
      prisma.refundRequest.count({ where: { status: "pending" } }),
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { costEstimateUsd: true, promptTokens: true, completionTokens: true },
        _count: true,
      }),
      prisma.safetyFlag.count({ where: { reviewed: false } }),
      prisma.user.groupBy({ by: ["locale"], _count: true }),
      prisma.supportTicket.findMany({ where: { status: { in: ["open", "in_progress"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    const payingUsers = await prisma.order.groupBy({ by: ["userId"], where: { status: "paid" } });
    const conversionRate = totalUsers > 0 ? (payingUsers.length / totalUsers) * 100 : 0;

    return NextResponse.json({
      totalUsers,
      newUsers30d,
      paidOrders,
      totalRevenueInPaise: totalRevenue._sum.amountInPaise ?? 0,
      pendingRefunds,
      aiRequests30d: aiUsage30d._count,
      aiCostUsd30d: aiUsage30d._sum.costEstimateUsd ?? 0,
      flaggedUnreviewed,
      conversionRate,
      localeBreakdown,
      recentTickets,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
