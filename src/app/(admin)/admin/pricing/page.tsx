"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type Template = { id: string; code: string; name: string; description: string; priceInPaise: number; active: boolean };
type Plan = { id: string; code: string; name: string; description: string; priceInPaise: number; creditsGranted: number; active: boolean };

export default function AdminPricingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: templates, isLoading: tLoading } = useQuery({
    queryKey: ["admin-report-templates"],
    queryFn: () => apiFetch<{ templates: Template[] }>("/api/admin/pricing/report-templates"),
  });
  const { data: plans, isLoading: pLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () => apiFetch<{ plans: Plan[] }>("/api/admin/pricing/plans"),
  });

  const updateTemplate = useMutation({
    mutationFn: (t: Template) => apiFetch("/api/admin/pricing/report-templates", { method: "POST", body: JSON.stringify(t) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-report-templates"] });
      toast({ title: "Saved", variant: "success" });
    },
  });

  const updatePlan = useMutation({
    mutationFn: (p: Plan) => apiFetch("/api/admin/pricing/plans", { method: "POST", body: JSON.stringify(p) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Saved", variant: "success" });
    },
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Pricing & Credits</h1>
      <p className="mt-1 text-sm text-muted">
        Credit pack pricing is configured in <code>src/lib/pricing/catalog.ts</code>. Report templates and plans below are DB-editable.
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase text-muted">Report templates</h2>
      {tLoading ? <Skeleton className="mt-2 h-40" /> : (
        <div className="mt-2 flex flex-col gap-3">
          {templates?.templates.map((t) => (
            <PriceRow key={t.id} item={t} onSave={(v) => updateTemplate.mutate(v as Template)} />
          ))}
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase text-muted">Plans</h2>
      {pLoading ? <Skeleton className="mt-2 h-40" /> : (
        <div className="mt-2 flex flex-col gap-3">
          {plans?.plans.map((p) => (
            <PriceRow key={p.id} item={p} onSave={(v) => updatePlan.mutate(v as Plan)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PriceRow<T extends { id: string; code: string; name: string; description: string; priceInPaise: number; active: boolean }>({
  item, onSave,
}: { item: T; onSave: (v: T) => void }) {
  const [price, setPrice] = useState((item.priceInPaise / 100).toString());

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-xs text-muted">{item.code} · {formatInr(item.priceInPaise)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" className="w-28" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Badge variant={item.active ? "success" : "danger"}>{item.active ? "active" : "inactive"}</Badge>
          <Button size="sm" onClick={() => onSave({ ...item, priceInPaise: Math.round(Number(price) * 100) })}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
