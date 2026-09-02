import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

function toCsvRow(values: (string | number)[]) {
  return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
}

// Deliberately excludes birth details and free-text chat content — CSV
// analytics export must never carry raw sensitive user data.
export async function GET() {
  try {
    await requireAdmin(["admin"]);

    const orders = await prisma.order.findMany({
      select: { id: true, type: true, status: true, amountInPaise: true, currency: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    let csv = toCsvRow(["order_id", "type", "status", "amount_inr", "currency", "created_at"]);
    for (const o of orders) {
      csv += toCsvRow([o.id, o.type, o.status, (o.amountInPaise / 100).toFixed(2), o.currency, o.createdAt.toISOString()]);
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=prerna-ai-orders-export.csv",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
