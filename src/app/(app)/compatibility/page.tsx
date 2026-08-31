"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";

type PersonForm = { birthDate: string; birthTimeKnown: boolean; birthTime: string; birthCity: string };
type CompatRequest = { id: string; personALabel: string; personBLabel: string; result: { text: string } | null; createdAt: string };

export default function CompatibilityPage() {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [personA, setPersonA] = useState<PersonForm>({ birthDate: "", birthTimeKnown: true, birthTime: "", birthCity: "" });
  const [personB, setPersonB] = useState<PersonForm>({ birthDate: "", birthTimeKnown: true, birthTime: "", birthCity: "" });
  const [saveConsent, setSaveConsent] = useState(false);

  const { data } = useQuery({ queryKey: ["compatibility"], queryFn: () => apiFetch<{ requests: CompatRequest[] }>("/api/compatibility") });

  const generate = useMutation({
    mutationFn: () =>
      apiFetch("/api/compatibility", {
        method: "POST",
        body: JSON.stringify({ personA, personB, savePersonBConsent: saveConsent }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compatibility"] });
      qc.invalidateQueries({ queryKey: ["credits-summary"] });
    },
    onError: (err) => {
      toast({
        title: err instanceof ApiError && err.status === 402 ? t("chat.outOfCredits") : t("errors.generic"),
        variant: "danger",
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/compatibility/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compatibility"] }),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("compatibility.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("compatibility.privacyNotice")}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <PersonCard title={t("compatibility.personA")} value={personA} onChange={setPersonA} />
        <PersonCard title={t("compatibility.personB")} value={personB} onChange={setPersonB} />
      </div>

      <label className="mt-4 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={saveConsent} onChange={(e) => setSaveConsent(e.target.checked)} />
        {t("compatibility.savePersonBConsent")}
      </label>

      <Button
        className="mt-4"
        disabled={!personA.birthDate || !personB.birthDate || generate.isPending}
        onClick={() => generate.mutate()}
      >
        {t("compatibility.generateInsight")}
      </Button>

      <div className="mt-8 flex flex-col gap-4">
        {data?.requests.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{r.personALabel} × {r.personBLabel}</CardTitle>
              <div className="flex items-center gap-2">
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
                <button className="text-muted hover:text-danger" onClick={() => remove.mutate(r.id)} aria-label={t("compatibility.deleteComparison")}>
                  <Trash2 size={15} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{r.result?.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PersonCard({ title, value, onChange }: { title: string; value: PersonForm; onChange: (v: PersonForm) => void }) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{t("common.optional")}: {t("onboarding.step7Title")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <Label className="mb-1.5 block text-xs">{t("onboarding.step5Title")}</Label>
          <Input type="date" value={value.birthDate} onChange={(e) => onChange({ ...value, birthDate: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">{t("onboarding.step6Title")}</Label>
          <Input
            type="time"
            value={value.birthTime}
            disabled={!value.birthTimeKnown}
            onChange={(e) => onChange({ ...value, birthTime: e.target.value })}
          />
          <label className="mt-1 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={!value.birthTimeKnown} onChange={(e) => onChange({ ...value, birthTimeKnown: !e.target.checked })} />
            {t("onboarding.step6UnknownTime")}
          </label>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">{t("onboarding.step7Title")}</Label>
          <Input value={value.birthCity} onChange={(e) => onChange({ ...value, birthCity: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
}
