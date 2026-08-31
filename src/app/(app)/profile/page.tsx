"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

type Profile = {
  id: string;
  name: string | null;
  gender: string | null;
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string | null;
  birthCity: string | null;
  birthCountry: string | null;
  primaryInterest: string | null;
} | null;

export default function ProfilePage() {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["birth-profile-summary"],
    queryFn: () => apiFetch<{ profile: Profile; completeness: number }>("/api/birth-profile"),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("nav.profile")}</h1>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("kundli.dataCompleteness")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={data?.completeness ?? 0} />
          <p className="mt-2 text-xs text-muted">{data?.completeness ?? 0}%</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="mt-4 h-96" />
      ) : (
        // Keyed on the loaded profile id so the form's local state is
        // (re)initialized from fresh data without needing a hydration effect.
        <ProfileForm key={data?.profile?.id ?? "new"} initial={data?.profile ?? null} hasProfile={!!data?.profile} />
      )}
    </div>
  );
}

function ProfileForm({ initial, hasProfile }: { initial: Profile; hasProfile: boolean }) {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    gender: initial?.gender ?? "",
    birthDate: initial?.birthDate?.slice(0, 10) ?? "",
    birthTimeKnown: initial?.birthTimeKnown ?? true,
    birthTime: initial?.birthTime ?? "",
    birthCity: initial?.birthCity ?? "",
    birthCountry: initial?.birthCountry ?? "India",
    primaryInterest: initial?.primaryInterest ?? "self_reflection",
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/api/birth-profile", {
        method: "POST",
        body: JSON.stringify({ ...form, birthTime: form.birthTimeKnown ? form.birthTime : undefined }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["birth-profile-summary"] });
      toast({ title: t("common.save"), variant: "success" });
    },
  });

  const remove = useMutation({
    mutationFn: () => apiFetch("/api/birth-profile", { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["birth-profile-summary"] });
      toast({ title: t("settings.deleteBirthDetails"), variant: "success" });
    },
  });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardDescription>{t("onboarding.step9Desc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label={t("onboarding.step3Title")}>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label={t("onboarding.step5Title")}>
          <Input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        </Field>
        <Field label={t("onboarding.step6Title")}>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={form.birthTime}
              disabled={!form.birthTimeKnown}
              onChange={(e) => setForm((f) => ({ ...f, birthTime: e.target.value }))}
            />
          </div>
          <label className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={!form.birthTimeKnown}
              onChange={(e) => setForm((f) => ({ ...f, birthTimeKnown: !e.target.checked }))}
            />
            {t("onboarding.step6UnknownTime")}
          </label>
        </Field>
        <Field label={t("onboarding.step7Title")}>
          <Input value={form.birthCity} onChange={(e) => setForm((f) => ({ ...f, birthCity: e.target.value }))} />
        </Field>
        <Field label="Country">
          <Input value={form.birthCountry} onChange={(e) => setForm((f) => ({ ...f, birthCountry: e.target.value }))} />
        </Field>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="danger" onClick={() => remove.mutate()} disabled={!hasProfile}>
          {t("settings.deleteBirthDetails")}
        </Button>
        <Button onClick={() => save.mutate()} disabled={!form.birthDate || save.isPending}>
          {t("common.save")}
        </Button>
      </CardFooter>
    </Card>
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
