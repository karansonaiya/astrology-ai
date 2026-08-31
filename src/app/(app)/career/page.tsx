"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";

export default function CareerPage() {
  const t = useT();
  const { toast } = useToast();
  const [form, setForm] = useState({ currentWork: "", skills: "", goals: "", timeHorizon: "6_months", mainConcern: "" });
  const [result, setResult] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () => apiFetch<{ text: string }>("/api/career", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (res) => setResult(res.text),
    onError: (err) => {
      toast({ title: err instanceof ApiError && err.status === 402 ? t("chat.outOfCredits") : t("errors.generic"), variant: "danger" });
    },
  });

  const complete = form.currentWork && form.skills && form.goals && form.mainConcern;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("career.title")}</h1>

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-4 pt-5">
          <Field label={t("career.currentWork")}>
            <Textarea value={form.currentWork} onChange={(e) => setForm((f) => ({ ...f, currentWork: e.target.value }))} />
          </Field>
          <Field label={t("career.skills")}>
            <Textarea value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} />
          </Field>
          <Field label={t("career.goals")}>
            <Textarea value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} />
          </Field>
          <Field label={t("career.timeHorizon")}>
            <Select value={form.timeHorizon} onValueChange={(v) => setForm((f) => ({ ...f, timeHorizon: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3_months">3 months</SelectItem>
                <SelectItem value="6_months">6 months</SelectItem>
                <SelectItem value="1_year">1 year</SelectItem>
                <SelectItem value="3_years">3 years</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("career.mainConcern")}>
            <Textarea value={form.mainConcern} onChange={(e) => setForm((f) => ({ ...f, mainConcern: e.target.value }))} />
          </Field>
          <Button disabled={!complete || generate.isPending} onClick={() => generate.mutate()}>
            {t("career.generateInsight")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-5">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("career.title")}</CardTitle>
            <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{result}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
