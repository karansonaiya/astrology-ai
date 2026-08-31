"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  totalUsers: number;
  newUsers30d: number;
  paidOrders: number;
  totalRevenueInPaise: number;
  pendingRefunds: number;
  aiRequests30d: number;
  aiCostUsd30d: number;
  flaggedUnreviewed: number;
  conversionRate: number;
  localeBreakdown: { locale: string; _count: number }[];
  recentTickets: { id: string; subject: string; status: string }[];
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => apiFetch<Stats>("/api/admin/stats") });

  if (isLoading || !data) {
    return (
      <div className="p-6"><Skeleton className="h-64" /></div>
    );
  }

  const tiles = [
    { label: "Total users", value: data.totalUsers },
    { label: "New users (30d)", value: data.newUsers30d },
    { label: "Paid orders", value: data.paidOrders },
    { label: "Revenue", value: formatInr(data.totalRevenueInPaise) },
    { label: "Conversion rate", value: `${data.conversionRate.toFixed(1)}%` },
    { label: "Pending refunds", value: data.pendingRefunds },
    { label: "AI requests (30d)", value: data.aiRequests30d },
    { label: "AI cost est. (30d)", value: `$${data.aiCostUsd30d.toFixed(2)}` },
    { label: "Unreviewed flags", value: data.flaggedUnreviewed },
  ];

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Admin Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="py-5">
              <p className="text-2xl font-semibold">{tile.value}</p>
              <p className="mt-1 text-xs text-muted">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Language breakdown</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.localeBreakdown.map((l) => (
              <div key={l.locale} className="flex justify-between text-sm">
                <span className="uppercase text-muted">{l.locale}</span>
                <span>{l._count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent open tickets</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.recentTickets.length ? data.recentTickets.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <span>{t.subject}</span>
                <span className="text-muted">{t.status}</span>
              </div>
            )) : <p className="text-sm text-muted">No open tickets.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
