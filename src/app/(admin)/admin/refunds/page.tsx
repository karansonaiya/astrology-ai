"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatInr, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Refund = {
  id: string; reason: string; status: string; createdAt: string;
  order: { amountInPaise: number; type: string };
  user: { name: string | null; email: string | null };
};

export default function AdminRefundsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-refunds"], queryFn: () => apiFetch<{ refunds: Refund[] }>("/api/admin/refunds") });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      apiFetch(`/api/admin/refunds/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Refund Requests</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {data?.refunds.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{r.user.name ?? r.user.email} — {formatInr(r.order.amountInPaise)} ({r.order.type})</p>
                  <p className="text-xs text-muted">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "pending" ? "default" : r.status === "approved" ? "success" : "danger"}>{r.status}</Badge>
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => decide.mutate({ id: r.id, decision: "approved" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, decision: "rejected" })}>Reject</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
