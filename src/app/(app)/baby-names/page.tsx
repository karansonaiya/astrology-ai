"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Baby, FileText } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { cn } from "@/lib/utils";
import { BABY_NAME_REPORT_CODES } from "@/lib/pricing/catalog";

type ReportTemplate = { code: string; priceInPaise: number };
type NameSuggestion = { name: string; meaning: string; gender: "boy" | "girl" | "unisex" };
type BabyNameResult = {
  nakshatra: string;
  pada: number | null;
  syllable: string;
  birthTimeApproximate: boolean;
  names: NameSuggestion[];
  note: string;
};

type FormState = {
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
  genderPreference: "boy" | "girl" | "any";
};

export default function BabyNamesPage() {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    birthDate: "",
    birthTimeKnown: true,
    birthTime: "",
    birthCity: "",
    birthCountry: "India",
    genderPreference: "any",
  });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [result, setResult] = useState<BabyNameResult | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const canSubmit = form.birthDate && form.birthCity.trim() && (!form.birthTimeKnown || form.birthTime);

  const generate = useMutation({
    mutationFn: () =>
      apiFetch<BabyNameResult>("/api/baby-names", {
        method: "POST",
        body: JSON.stringify({
          birthDate: form.birthDate,
          birthTimeKnown: form.birthTimeKnown,
          birthTime: form.birthTimeKnown ? form.birthTime : undefined,
          birthCity: form.birthCity,
          birthCountry: form.birthCountry,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          genderPreference: form.genderPreference,
        }),
      }),
    onSuccess: (res) => setResult(res),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
    },
  });

  const { data: templatesData } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: ReportTemplate[] }>("/api/reports/templates"),
  });
  const detailedReportPrice = templatesData?.templates.find((tp) => BABY_NAME_REPORT_CODES.has(tp.code))?.priceInPaise;

  const goToDetailedReport = () => {
    try {
      sessionStorage.setItem(
        "prerna:baby-name-handoff",
        JSON.stringify({
          birthDate: form.birthDate,
          birthTimeKnown: form.birthTimeKnown,
          birthTime: form.birthTime,
          birthCity: form.birthCity,
          birthCountry: form.birthCountry,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          genderPreference: form.genderPreference,
          savedAt: Date.now(),
        })
      );
    } catch {
      // sessionStorage unavailable — the paid flow's own form still works, just not pre-filled.
    }
    router.push("/reports?upsell=baby-names");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Baby size={22} className="text-primary" /> {t("babyNames.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("babyNames.subtitle")}</p>

      {!result && (
        <Card className="mt-6">
          <CardContent className="grid gap-3 pt-5">
            <div>
              <Label htmlFor="bn-date">{t("babyNames.birthDateLabel")}</Label>
              <Input
                id="bn-date"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bn-time">{t("babyNames.birthTimeLabel")}</Label>
              <Input
                id="bn-time"
                type="time"
                value={form.birthTime}
                disabled={!form.birthTimeKnown}
                onChange={(e) => setForm((f) => ({ ...f, birthTime: e.target.value }))}
                className="mt-1.5"
              />
              <label className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={form.birthTimeKnown}
                  onChange={(e) => setForm((f) => ({ ...f, birthTimeKnown: e.target.checked }))}
                />
                {t("babyNames.timeKnownLabel")}
              </label>
            </div>
            <div>
              <Label>{t("babyNames.cityLabel")}</Label>
              <div className="mt-1.5">
                <CityAutocomplete
                  value={form.birthCity}
                  onChange={(text) => {
                    setForm((f) => ({ ...f, birthCity: text }));
                    setCoords(null);
                  }}
                  onSelect={(place) => {
                    setForm((f) => ({ ...f, birthCountry: place.country }));
                    setCoords({ latitude: place.latitude, longitude: place.longitude });
                  }}
                />
              </div>
            </div>
            <div>
              <Label>{t("babyNames.genderLabel")}</Label>
              <div className="mt-1.5 flex gap-2">
                {(["any", "boy", "girl"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, genderPreference: g }))}
                    className={cn(
                      "focus-ring rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      form.genderPreference === g ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground"
                    )}
                  >
                    {t(`babyNames.gender.${g}`)}
                  </button>
                ))}
              </div>
            </div>
            <Button className="mt-2 w-fit" disabled={!canSubmit || generate.isPending} onClick={() => generate.mutate()}>
              <Sparkles size={16} />
              {generate.isPending ? t("babyNames.generating") : t("babyNames.generate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {generate.isPending && <Skeleton className="mt-4 h-40" />}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="mb-2">
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
              </div>
              <p className="text-sm leading-relaxed">
                {t("babyNames.realDataLine", { nakshatra: result.nakshatra, syllable: result.syllable })}
              </p>
              {result.birthTimeApproximate && <p className="mt-1.5 text-xs text-gold">{t("babyNames.approximateNotice")}</p>}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {result.names.map((n) => (
              <Card key={n.name}>
                <CardHeader>
                  <CardTitle className="text-base">{n.name}</CardTitle>
                  <CardDescription>{t(`babyNames.gender.${n.gender}`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{n.meaning}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-sm italic text-muted">{result.note}</p>

          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t("babyNames.detailedReportTitle")}</p>
                <p className="text-xs text-muted">{t("babyNames.detailedReportDesc")}</p>
              </div>
              <Button onClick={goToDetailedReport} className="shrink-0">
                <FileText size={16} />
                {t("babyNames.getDetailedReport")}
                {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-fit" onClick={() => setResult(null)}>
            {t("babyNames.startOver")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
