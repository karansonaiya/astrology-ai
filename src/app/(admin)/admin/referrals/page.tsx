"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type Rule = { triggerEvent: string; referrerReward: number; referredReward: number; active: boolean };

export default function AdminReferralsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-referral-rule"], queryFn: () => apiFetch<{ rule: Rule }>("/api/admin/referral-rule") });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Referral Management</h1>
      {isLoading ? <Skeleton className="mt-4 h-64 max-w-md" /> : <RuleForm initial={data?.rule ?? null} />}
    </div>
  );
}

function RuleForm({ initial }: { initial: Rule | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState<Rule>(
    initial ?? { triggerEvent: "first_purchase", referrerReward: 20, referredReward: 10, active: true }
  );

  const save = useMutation({
    mutationFn: () => apiFetch("/api/admin/referral-rule", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => toast({ title: "Saved", variant: "success" }),
  });

  return (
    <Card className="mt-4 max-w-md">
      <CardHeader>
        <CardTitle className="text-base">Reward rule</CardTitle>
        <CardDescription>Controls credits granted to both sides of a referral.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
        </div>
        <div>
          <Label className="mb-1.5 block">Referrer reward (credits)</Label>
          <Input type="number" value={form.referrerReward} onChange={(e) => setForm((f) => ({ ...f, referrerReward: Number(e.target.value) }))} />
        </div>
        <div>
          <Label className="mb-1.5 block">Referred user reward (credits)</Label>
          <Input type="number" value={form.referredReward} onChange={(e) => setForm((f) => ({ ...f, referredReward: Number(e.target.value) }))} />
        </div>
        <Button onClick={() => save.mutate()}>Save</Button>
      </CardContent>
    </Card>
  );
}
