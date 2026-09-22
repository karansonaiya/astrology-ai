"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Request = {
  id: string;
  pujaName: string;
  preferredDate: string | null;
  contactPhone: string;
  notes: string | null;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string | null; phone: string | null };
};

const STATUSES = ["pending", "contacted", "scheduled", "completed", "cancelled"];

export default function AdminPujaRequestsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-puja-requests"], queryFn: () => apiFetch<{ requests: Request[] }>("/api/admin/puja-requests") });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/admin/puja-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-puja-requests"] }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Puja Booking Requests</h1>
      <p className="mt-1 text-sm text-muted">
        Real leads from users — no real pandit network exists yet, so these need manual follow-up until one does.
      </p>
      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {data?.requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 break-words">
                  <p className="text-sm font-medium">{r.pujaName} — {r.user.name ?? r.user.email}</p>
                  <p className="text-xs text-muted">Phone: {r.contactPhone}{r.preferredDate ? ` · Preferred: ${formatDateTime(r.preferredDate)}` : ""}</p>
                  {r.notes && <p className="mt-1 text-xs text-muted">{r.notes}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDateTime(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "completed" ? "success" : r.status === "cancelled" ? "danger" : "default"}>{r.status}</Badge>
                  <Select value={r.status} onValueChange={(status) => updateStatus.mutate({ id: r.id, status })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.requests.length === 0 && <p className="py-10 text-center text-sm text-muted">No requests yet.</p>}
        </div>
      )}
    </div>
  );
}
