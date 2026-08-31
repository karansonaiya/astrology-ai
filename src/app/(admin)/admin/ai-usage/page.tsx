"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AiUsage = {
  byFeature: { feature: string; _count: number; _sum: { costEstimateUsd: number | null; promptTokens: number | null; completionTokens: number | null } }[];
  byProvider: { provider: string; model: string; _count: number; _sum: { costEstimateUsd: number | null } }[];
  recent: { id: string; feature: string; provider: string; model: string; costEstimateUsd: number; createdAt: string }[];
};

export default function AdminAiUsagePage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-ai-usage"], queryFn: () => apiFetch<AiUsage>("/api/admin/ai-usage") });

  if (isLoading || !data) return <div className="p-6"><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">AI Usage & Cost</h1>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">By feature</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {data.byFeature.map((f) => (
              <div key={f.feature} className="flex justify-between">
                <span className="capitalize">{f.feature}</span>
                <span className="text-muted">{f._count} req · ${(f._sum.costEstimateUsd ?? 0).toFixed(3)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By provider / model</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {data.byProvider.map((p) => (
              <div key={`${p.provider}-${p.model}`} className="flex justify-between">
                <span>{p.provider} · {p.model}</span>
                <span className="text-muted">{p._count} req · ${(p._sum.costEstimateUsd ?? 0).toFixed(3)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">Recent requests</CardTitle></CardHeader>
        <CardContent className="scroll-x">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="py-2">Feature</th><th>Provider</th><th>Model</th><th>Cost</th><th>Time</th></tr></thead>
            <tbody>
              {data.recent.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 capitalize">{r.feature}</td>
                  <td>{r.provider}</td>
                  <td>{r.model}</td>
                  <td>${r.costEstimateUsd.toFixed(4)}</td>
                  <td className="text-muted">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
