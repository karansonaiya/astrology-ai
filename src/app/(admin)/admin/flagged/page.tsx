"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Flag = {
  id: string; category: string; severity: string; reviewed: boolean; notes: string | null; createdAt: string;
  message: { content: string; chat: { user: { name: string | null; email: string | null } } };
};

export default function AdminFlaggedPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-flagged"], queryFn: () => apiFetch<{ flags: Flag[] }>("/api/admin/flagged") });

  const review = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/flagged/${id}`, { method: "PATCH", body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-flagged"] }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Flagged Conversations</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {data?.flags.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={f.severity === "critical" || f.severity === "high" ? "danger" : "default"}>{f.category}</Badge>
                    <Badge>{f.severity}</Badge>
                  </div>
                  <span className="text-xs text-muted">{formatDateTime(f.createdAt)}</span>
                </div>
                <p className="text-sm text-muted">{f.message.chat.user.name ?? f.message.chat.user.email}</p>
                <p className="rounded-lg bg-surface-raised p-2 text-xs">{f.message.content}</p>
                {!f.reviewed && (
                  <Button size="sm" variant="outline" className="w-fit" onClick={() => review.mutate(f.id)}>Mark reviewed</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {data?.flags.length === 0 && <p className="text-sm text-muted">No flagged conversations.</p>}
        </div>
      )}
    </div>
  );
}
