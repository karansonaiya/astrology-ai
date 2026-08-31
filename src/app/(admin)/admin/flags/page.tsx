"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

type Flag = { id: string; key: string; enabled: boolean; description: string | null };

export default function AdminFlagsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-flags"], queryFn: () => apiFetch<{ flags: Flag[] }>("/api/admin/feature-flags") });

  const toggle = useMutation({
    mutationFn: (flag: Flag) =>
      apiFetch("/api/admin/feature-flags", { method: "POST", body: JSON.stringify({ key: flag.key, enabled: !flag.enabled, description: flag.description ?? undefined }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-flags"] }),
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Feature Flags & Maintenance</h1>
      <p className="mt-1 text-sm text-muted">Toggling <code>maintenance_mode</code> shows a banner across the authenticated app.</p>

      {isLoading ? (
        <Skeleton className="mt-4 h-40" />
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {data?.flags.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{f.key}</p>
                  <p className="text-xs text-muted">{f.description}</p>
                </div>
                <Switch checked={f.enabled} onCheckedChange={() => toggle.mutate(f)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
