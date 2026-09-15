"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, FileText } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { useCheckout } from "@/lib/payments/use-checkout";
import { COMPATIBILITY_REPORT_CODES } from "@/lib/pricing/catalog";
import { useRouter } from "next/navigation";

type PersonForm = {
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string;
  birthCity: string;
  birthCountry?: string;
  latitude?: number;
  longitude?: number;
};
type KootSet = { varna: string; vasya: string; tara: string; yoni: string; grahaMaitri: string; gana: string; bhakoot: string; nadi: string };
type PersonMatchInfo = { koot: KootSet; nakshatra: { name: string; pada: number; lord: string }; rasi: { name: string; lord: string } };
type GunaMilanResult = {
  isDemoData: boolean;
  girl: PersonMatchInfo;
  boy: PersonMatchInfo;
  messageType: string;
  messageDescription: string;
  totalPoints: number;
  maximumPoints: number;
};
type CompatRequest = {
  id: string;
  personALabel: string;
  personBLabel: string;
  result: { text: string; gunaMilan: GunaMilanResult | null } | null;
  createdAt: string;
};
type ReportTemplate = { code: string; priceInPaise: number };

export default function CompatibilityPage() {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { checkout, loading: checkoutLoading } = useCheckout();

  const [personA, setPersonA] = useState<PersonForm>({ birthDate: "", birthTimeKnown: true, birthTime: "", birthCity: "" });
  const [personB, setPersonB] = useState<PersonForm>({ birthDate: "", birthTimeKnown: true, birthTime: "", birthCity: "" });
  const [saveConsent, setSaveConsent] = useState(false);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["compatibility"], queryFn: () => apiFetch<{ requests: CompatRequest[] }>("/api/compatibility") });
  const { data: templatesData } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: ReportTemplate[] }>("/api/reports/templates"),
  });
  const detailedReportPrice = templatesData?.templates.find((tp) => COMPATIBILITY_REPORT_CODES.has(tp.code))?.priceInPaise;

  const buyDetailedReport = (requestId: string) => {
    checkout(
      { type: "report", code: "compatibility_report", compatibilityRequestId: requestId },
      {
        onSuccess: (result) => {
          toast({ title: t("payments.paymentSuccessTitle"), variant: "success" });
          qc.invalidateQueries({ queryKey: ["credits-summary"] });
          if (result.reportPurchaseId) router.push(`/reports/${result.reportPurchaseId}`);
        },
        onError: (msg) => toast({ title: t("payments.paymentFailedTitle"), description: msg, variant: "danger" }),
      }
    );
  };

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
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
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
            <CardContent className="flex flex-col gap-4">
              {r.result?.gunaMilan && <GunaMilanCard gunaMilan={r.result.gunaMilan} personALabel={r.personALabel} personBLabel={r.personBLabel} />}
              {r.result?.text && <AiMarkdown content={r.result.text} className="text-foreground/90" />}
            </CardContent>
            <CardFooter className="justify-end">
              <Button size="sm" disabled={checkoutLoading} onClick={() => buyDetailedReport(r.id)}>
                <FileText size={14} />
                {t("compatibility.getDetailedReport")}
                {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}

function GunaMilanCard({ gunaMilan, personALabel, personBLabel }: { gunaMilan: GunaMilanResult; personALabel: string; personBLabel: string }) {
  const t = useT();
  const koots: { key: keyof KootSet; label: string }[] = [
    { key: "varna", label: t("compatibility.koot.varna") },
    { key: "vasya", label: t("compatibility.koot.vasya") },
    { key: "tara", label: t("compatibility.koot.tara") },
    { key: "yoni", label: t("compatibility.koot.yoni") },
    { key: "grahaMaitri", label: t("compatibility.koot.grahaMaitri") },
    { key: "gana", label: t("compatibility.koot.gana") },
    { key: "bhakoot", label: t("compatibility.koot.bhakoot") },
    { key: "nadi", label: t("compatibility.koot.nadi") },
  ];

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{t("compatibility.gunaMilanTitle")}</p>
        <p className="text-lg font-bold text-gold">
          {gunaMilan.totalPoints} <span className="text-sm font-normal text-muted">/ {gunaMilan.maximumPoints}</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-foreground/90">{gunaMilan.messageDescription}</p>
      {gunaMilan.isDemoData && <p className="mt-1 text-xs text-muted">{t("compatibility.demoDataNotice")}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 pr-2 font-medium">{t("compatibility.kootFactor")}</th>
              <th className="py-1 pr-2 font-medium">{personALabel}</th>
              <th className="py-1 font-medium">{personBLabel}</th>
            </tr>
          </thead>
          <tbody>
            {koots.map((k) => (
              <tr key={k.key} className="border-t border-border/60">
                <td className="py-1.5 pr-2 text-muted">{k.label}</td>
                <td className="py-1.5 pr-2">{gunaMilan.girl.koot[k.key]}</td>
                <td className="py-1.5">{gunaMilan.boy.koot[k.key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <CityAutocomplete
            value={value.birthCity}
            onChange={(text) => onChange({ ...value, birthCity: text, latitude: undefined, longitude: undefined })}
            onSelect={(place) => onChange({ ...value, birthCountry: place.country, latitude: place.latitude, longitude: place.longitude })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
