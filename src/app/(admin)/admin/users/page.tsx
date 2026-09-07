"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type AdminUser = {
  id: string; name: string | null; email: string | null; phone: string | null;
  role: string; status: string; locale: string; createdAt: string;
  _count: { orders: number; chats: number };
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creditTarget, setCreditTarget] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("5");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => apiFetch<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const grantCredits = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/users/${creditTarget!.id}/credits`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), reason }),
      }),
    onSuccess: () => {
      toast({ title: `${amount} credits added for ${creditTarget?.name ?? creditTarget?.email ?? "user"}`, variant: "success" });
      setCreditTarget(null);
      setAmount("5");
      setReason("");
    },
    onError: () => toast({ title: "Couldn't add credits — check the amount and try again.", variant: "danger" }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Users</h1>
      <Input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="mt-4 max-w-sm" />

      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 scroll-x">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Name</th><th>Contact</th><th>Role</th><th>Status</th><th>Joined</th><th>Activity</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2">{u.name ?? "—"}</td>
                  <td className="text-muted">{u.email ?? u.phone ?? "—"}</td>
                  <td><Badge>{u.role}</Badge></td>
                  <td><Badge variant={u.status === "active" ? "success" : "danger"}>{u.status}</Badge></td>
                  <td className="text-muted">{formatDate(u.createdAt)}</td>
                  <td className="text-muted">{u._count.orders} orders · {u._count.chats} chats</td>
                  <td className="flex gap-2 py-2">
                    <Button size="sm" variant="outline" onClick={() => setCreditTarget(u)}>
                      Add credits
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patch.mutate({ id: u.id, body: { status: u.status === "active" ? "suspended" : "active" } })}
                    >
                      {u.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!creditTarget} onOpenChange={(open) => !open && setCreditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add credits</DialogTitle>
            <DialogDescription>
              For {creditTarget?.name ?? creditTarget?.email ?? creditTarget?.phone} — e.g. the AI didn&apos;t answer
              properly and a free question or credit was used for nothing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted">Credits to add</label>
              <Input type="number" min={1} max={100} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Reason (kept in the audit log)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Ticket #123 — AI gave an empty reply, question was still charged."
                className="mt-1"
              />
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            disabled={!amount || Number(amount) < 1 || reason.trim().length < 3 || grantCredits.isPending}
            onClick={() => grantCredits.mutate()}
          >
            {grantCredits.isPending ? "Adding…" : `Add ${amount || 0} credits`}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
