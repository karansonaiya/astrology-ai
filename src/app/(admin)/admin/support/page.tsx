"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Ticket = {
  id: string; subject: string; message: string; status: string;
  user: { name: string | null; email: string | null };
  replies: { id: string; message: string }[];
};

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-support"], queryFn: () => apiFetch<{ tickets: Ticket[] }>("/api/admin/support-tickets") });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const reply = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiFetch(`/api/admin/support-tickets/${id}`, { method: "PATCH", body: JSON.stringify({ reply: message, status: "in_progress" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-support"] }),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/support-tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-support"] }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Support Tickets</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {data?.tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.subject} — {t.user.name ?? t.user.email}</p>
                  <Badge variant={t.status === "resolved" || t.status === "closed" ? "success" : "default"}>{t.status}</Badge>
                </div>
                <p className="text-sm text-muted">{t.message}</p>
                {t.replies.map((r) => (
                  <p key={r.id} className="rounded-lg bg-surface-raised p-2 text-xs">{r.message}</p>
                ))}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a reply…"
                    value={drafts[t.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                    className="min-h-16"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!drafts[t.id]} onClick={() => { reply.mutate({ id: t.id, message: drafts[t.id] }); setDrafts((d) => ({ ...d, [t.id]: "" })); }}>
                    Reply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve.mutate(t.id)}>Mark resolved</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
