"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { PageHeader } from "@/components/app/page-header";

export default function CareerPage() {
  const t = useT();
  const { toast } = useToast();
  const [form, setForm] = useState({ currentWork: "", skills: "", goals: "", timeHorizon: "6_months", mainConcern: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const generate = useMutation({
    mutationFn: () => apiFetch<{ text: string }>("/api/career", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (res) => setResult(res.text),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = () => {
    const next: Record<string, string> = {};
    if (!form.currentWork.trim()) next.currentWork = t("errors.fieldRequired");
    if (!form.skills.trim()) next.skills = t("errors.fieldRequired");
    if (!form.goals.trim()) next.goals = t("errors.fieldRequired");
    if (!form.mainConcern.trim()) next.mainConcern = t("errors.fieldRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    generate.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader icon={Briefcase} title={t("career.title")} />

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-4 pt-5">
          <Field label={t("career.currentWork")} error={errors.currentWork}>
            <Textarea
              value={form.currentWork}
              onChange={(e) => setField("currentWork")(e.target.value)}
              className={errors.currentWork ? "border-danger" : undefined}
            />
          </Field>
          <Field label={t("career.skills")} error={errors.skills}>
            <Textarea
              value={form.skills}
              onChange={(e) => setField("skills")(e.target.value)}
              className={errors.skills ? "border-danger" : undefined}
            />
          </Field>
          <Field label={t("career.goals")} error={errors.goals}>
            <Textarea
              value={form.goals}
              onChange={(e) => setField("goals")(e.target.value)}
              className={errors.goals ? "border-danger" : undefined}
            />
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
          <Field label={t("career.mainConcern")} error={errors.mainConcern}>
            <Textarea
              value={form.mainConcern}
              onChange={(e) => setField("mainConcern")(e.target.value)}
              className={errors.mainConcern ? "border-danger" : undefined}
            />
          </Field>
          <Button disabled={generate.isPending} onClick={handleSubmit}>
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
            <AiMarkdown content={result} className="text-foreground/90" />
          </CardContent>
        </Card>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
