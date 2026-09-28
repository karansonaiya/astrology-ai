"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/page-header";

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
      <PageHeader icon={User} title={t("nav.profile")} />

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
  const [birthCoords, setBirthCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/api/birth-profile", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          birthTime: form.birthTimeKnown ? form.birthTime : undefined,
          latitude: birthCoords?.latitude,
          longitude: birthCoords?.longitude,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["birth-profile-summary"] });
      toast({ title: t("common.save"), variant: "success" });
    },
    onError: () => toast({ title: t("errors.generic"), variant: "danger" }),
  });

  const handleSave = () => {
    if (!form.birthDate) {
      setBirthDateError(t("errors.fieldRequired"));
      return;
    }
    setBirthDateError(null);
    save.mutate();
  };

  const remove = useMutation({
    mutationFn: () => apiFetch("/api/birth-profile", { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["birth-profile-summary"] });
      toast({ title: t("settings.deleteBirthDetails"), variant: "success" });
    },
    onError: () => toast({ title: t("errors.generic"), variant: "danger" }),
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
        <Field label={t("onboarding.step5Title")} error={birthDateError ?? undefined}>
          <Input
            type="date"
            value={form.birthDate}
            onChange={(e) => {
              setForm((f) => ({ ...f, birthDate: e.target.value }));
              if (birthDateError) setBirthDateError(null);
            }}
            className={birthDateError ? "border-danger" : undefined}
          />
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
          <CityAutocomplete
            value={form.birthCity}
            onChange={(text) => {
              setForm((f) => ({ ...f, birthCity: text }));
              setBirthCoords(null);
            }}
            onSelect={(place) => {
              setForm((f) => ({ ...f, birthCountry: place.country }));
              setBirthCoords({ latitude: place.latitude, longitude: place.longitude });
            }}
          />
        </Field>
        <Field label="Country">
          <Input value={form.birthCountry} onChange={(e) => setForm((f) => ({ ...f, birthCountry: e.target.value }))} />
        </Field>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="danger" onClick={() => remove.mutate()} disabled={!hasProfile}>
          {t("settings.deleteBirthDetails")}
        </Button>
        <Button onClick={handleSave} disabled={save.isPending}>
          {t("common.save")}
        </Button>
      </CardFooter>
    </Card>
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
