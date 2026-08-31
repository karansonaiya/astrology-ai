"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatInr, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type AdminOrder = {
  id: string; type: string; status: string; amountInPaise: number; createdAt: string;
  user: { name: string | null; email: string | null; phone: string | null };
};

export default function AdminPaymentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-payments"], queryFn: () => apiFetch<{ orders: AdminOrder[] }>("/api/admin/payments") });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Payments</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 scroll-x">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr><th className="py-2">User</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {data?.orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2">{o.user.name ?? o.user.email ?? o.user.phone ?? "—"}</td>
                  <td className="capitalize text-muted">{o.type.replace("_", " ")}</td>
                  <td>{formatInr(o.amountInPaise)}</td>
                  <td><Badge variant={o.status === "paid" ? "success" : o.status === "failed" ? "danger" : "default"}>{o.status}</Badge></td>
                  <td className="text-muted">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
