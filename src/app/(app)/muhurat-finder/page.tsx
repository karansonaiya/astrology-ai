"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, CalendarClock, FileText, CircleCheck, CircleX } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { cn } from "@/lib/utils";
import { MUHURAT_REPORT_CODES } from "@/lib/pricing/catalog";

type ReportTemplate = { code: string; priceInPaise: number };
type EventType = "general" | "travel" | "business_start";
type MuhuratWindow = { name: string; type: string; start: string; end: string; isSpecialForEvent: boolean };
type MuhuratVerdict = {
  eventType: EventType;
  date: string;
  vaara: string | null;
  favorableWindows: MuhuratWindow[];
  avoidWindows: MuhuratWindow[];
  abhijitWindow: { start: string; end: string } | null;
};
type MuhuratReading = { title: string; recommendation: string; avoidNote: string; summary: string };
type Result = { verdict: MuhuratVerdict; reading: MuhuratReading; isDemoData: boolean };

type FormState = { eventType: EventType; date: string; city: string; country: string };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MuhuratFinderPage() {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ eventType: "general", date: todayStr(), city: "", country: "India" });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const canSubmit = form.date && form.city.trim();

  const generate = useMutation({
    mutationFn: () =>
      apiFetch<Result>("/api/muhurat-finder", {
        method: "POST",
        body: JSON.stringify({
          eventType: form.eventType,
          date: form.date,
          city: form.city,
          country: form.country,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
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
  const detailedReportPrice = templatesData?.templates.find((tp) => MUHURAT_REPORT_CODES.has(tp.code))?.priceInPaise;

  const goToDetailedReport = () => {
    try {
      sessionStorage.setItem(
        "prerna:muhurat-handoff",
        JSON.stringify({
          eventType: form.eventType,
          startDate: form.date,
          city: form.city,
          country: form.country,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          savedAt: Date.now(),
        })
      );
    } catch {
      // sessionStorage unavailable — the paid flow's own form still works, just not pre-filled.
    }
    router.push("/reports?upsell=muhurat");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <CalendarClock size={22} className="text-primary" /> {t("muhurat.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("muhurat.subtitle")}</p>

      {!result && (
        <Card className="mt-6">
          <CardContent className="grid gap-3 pt-5">
            <div>
              <Label>{t("muhurat.eventTypeLabel")}</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(["general", "travel", "business_start"] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, eventType: e }))}
                    className={cn(
                      "focus-ring rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      form.eventType === e ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground"
                    )}
                  >
                    {t(`muhurat.eventType.${e}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="mh-date">{t("muhurat.dateLabel")}</Label>
              <Input
                id="mh-date"
                type="date"
                value={form.date}
                min={todayStr()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t("muhurat.cityLabel")}</Label>
              <div className="mt-1.5">
                <CityAutocomplete
                  value={form.city}
                  onChange={(text) => {
                    setForm((f) => ({ ...f, city: text }));
                    setCoords(null);
                  }}
                  onSelect={(place) => {
                    setForm((f) => ({ ...f, country: place.country }));
                    setCoords({ latitude: place.latitude, longitude: place.longitude });
                  }}
                />
              </div>
            </div>
            <Button className="mt-2 w-fit" disabled={!canSubmit || generate.isPending} onClick={() => generate.mutate()}>
              <Sparkles size={16} />
              {generate.isPending ? t("muhurat.generating") : t("muhurat.generate")}
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
              <p className="text-sm font-medium text-foreground">{result.reading.title}</p>
              <p className="mt-2 text-sm leading-relaxed">{result.reading.recommendation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CircleCheck size={16} className="text-green-600" /> {t("muhurat.favorableTitle")}
              </p>
              {result.verdict.favorableWindows.length ? (
                <div className="flex flex-col gap-2">
                  {result.verdict.favorableWindows.map((w, i) => (
                    <div
                      key={`${w.name}-${w.start}-${i}`}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                        w.isSpecialForEvent ? "border-gold/40 bg-gold/5" : "border-border"
                      )}
                    >
                      <span>
                        {w.name} <span className="text-xs text-muted">({w.type})</span>
                        {w.isSpecialForEvent && <span className="ml-1.5 text-xs font-medium text-gold">{t("muhurat.especiallyGoodFor")}</span>}
                      </span>
                      <span className="text-muted">{w.start}–{w.end}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t("muhurat.noFavorableWindows")}</p>
              )}
              {result.verdict.abhijitWindow && (
                <p className="mt-3 text-xs text-muted">
                  {t("muhurat.abhijitLabel")}: {result.verdict.abhijitWindow.start}–{result.verdict.abhijitWindow.end}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CircleX size={16} className="text-red-600" /> {t("muhurat.avoidTitle")}
              </p>
              {result.verdict.avoidWindows.length ? (
                <div className="flex flex-col gap-2">
                  {result.verdict.avoidWindows.map((w, i) => (
                    <div key={`${w.name}-${w.start}-${i}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{w.name}</span>
                      <span className="text-muted">{w.start}–{w.end}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t("muhurat.noAvoidWindows")}</p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted">{result.reading.avoidNote}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <p className="text-sm leading-relaxed">{result.reading.summary}</p>
            </CardContent>
          </Card>

          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t("muhurat.detailedReportTitle")}</p>
                <p className="text-xs text-muted">{t("muhurat.detailedReportDesc")}</p>
              </div>
              <Button onClick={goToDetailedReport} className="shrink-0">
                <FileText size={16} />
                {t("muhurat.getDetailedReport")}
                {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-fit" onClick={() => setResult(null)}>
            {t("muhurat.startOver")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
