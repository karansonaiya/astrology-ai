"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type AdminUser = {
  id: string; name: string | null; email: string | null; phone: string | null;
  role: string; status: string; locale: string; createdAt: string;
  _count: { orders: number; chats: number };
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => apiFetch<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Users</h1>
      <Input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="mt-4 max-w-sm" />

      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 scroll-x">
          <table className="w-full min-w-[720px] text-left text-sm">
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
    </div>
  );
}
