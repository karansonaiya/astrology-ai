"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TriangleAlert, Users, ArrowLeft, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ZodiacWheel } from "@/components/astrology/zodiac-wheel";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { ZODIAC_LABELS, type ZodiacSign } from "@/lib/zodiac";
import { CORE_EXPLANATIONS, PLANET_LABELS, HOUSE_THEMES, buildPlanetInterpretation } from "@/lib/astrology/interpretations";
import type { AppLocale } from "@/lib/i18n/config";

type Calculation = {
  isDemoData: boolean;
  sunSign: ZodiacSign | null;
  moonSign: ZodiacSign | null;
  ascendant: ZodiacSign | null;
  nakshatra: string | null;
  planetaryPositions: { planet: string; sign: ZodiacSign; degree: number; house: number | null; retrograde: boolean }[] | null;
  houses: { house: number; sign: ZodiacSign }[] | null;
  dasha: { period: string; from: string; to: string }[] | null;
  configRequired?: boolean;
};
type KundliResponse = { hasProfile: false } | { hasProfile: true; calculation: Calculation; completeness: number; configRequired: boolean };
type LookupResponse = { name: string | null; calculation: Calculation };

type ExplanationSection = { icon: string; title: string; paragraphs: string[]; bullets?: string[]; highlight?: string };
type KundliExplanation = {
  intro: string;
  sections: ExplanationSection[];
  strongestCombination: { points: { title: string; desc: string }[]; summary: string };
  challenges: { items: string[]; note: string };
  shortSummary: string;
};

export default function KundliPage() {
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["kundli"], queryFn: () => apiFetch<KundliResponse>("/api/kundli") });

  const [mode, setMode] = useState<"mine" | "form" | "result">("mine");
  const [othersResult, setOthersResult] = useState<LookupResponse | null>(null);

  if (mode === "form") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <OthersLookupForm
          onCancel={() => setMode("mine")}
          onResult={(res) => {
            setOthersResult(res);
            setMode("result");
          }}
        />
      </div>
    );
  }

  if (mode === "result" && othersResult) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">
            {othersResult.name ? t("kundli.othersKundliTitle", { name: othersResult.name }) : t("kundli.othersKundliTitleFallback")}
          </h1>
          <Button variant="outline" size="sm" onClick={() => setMode("mine")}>
            <ArrowLeft size={14} /> {t("kundli.backToMine")}
          </Button>
        </div>
        <KundliDisplay calc={othersResult.calculation} own={false} name={othersResult.name ?? undefined} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (data && !data.hasProfile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center md:px-6">
        <h1 className="font-heading text-2xl font-semibold">{t("kundli.title")}</h1>
        <p className="mt-3 text-muted">{t("dashboard.completeProfileCta")}</p>
        <Button asChild className="mt-4"><Link href="/profile">{t("common.edit")}</Link></Button>
        <div className="mt-6 border-t border-border pt-6">
          <Button variant="outline" onClick={() => setMode("form")}>
            <Users size={16} /> {t("kundli.viewOthersButton")}
          </Button>
        </div>
      </div>
    );
  }

  const calc = data?.calculation;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold">{t("kundli.title")}</h1>
        <div className="flex items-center gap-2">
          {calc?.isDemoData && <Badge variant="gold">{t("kundli.demoDataNotice")}</Badge>}
          <Button variant="outline" size="sm" onClick={() => setMode("form")}>
            <Users size={14} /> {t("kundli.viewOthersButton")}
          </Button>
        </div>
      </div>

      {data?.configRequired && (
        <Card className="mt-4 border-danger/30">
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <TriangleAlert size={20} className="mt-0.5 text-danger" />
            <div>
              <CardTitle className="text-base">{t("kundli.configRequiredTitle")}</CardTitle>
              <CardDescription>{t("kundli.configRequiredDesc")}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {calc && <KundliDisplay calc={calc} own={true} />}
    </div>
  );
}

/** Shared render for a calculated chart — used for both "my kundli" and a looked-up other person's. */
function KundliDisplay({ calc, own, name }: { calc: Calculation; own: boolean; name?: string }) {
  const t = useT();
  const { locale } = useI18n();

  return (
    <>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <ZodiacWheel locale={locale} label={t("kundli.zodiacWheelLabel")} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <SummaryRow label={t("kundli.sunSign")} value={calc.sunSign ? ZODIAC_LABELS[calc.sunSign][locale] : "—"} description={CORE_EXPLANATIONS.sunSign[locale]} />
          <SummaryRow label={t("kundli.moonSign")} value={calc.moonSign ? ZODIAC_LABELS[calc.moonSign][locale] : "—"} description={CORE_EXPLANATIONS.moonSign[locale]} />
          <SummaryRow label={t("kundli.ascendant")} value={calc.ascendant ? ZODIAC_LABELS[calc.ascendant][locale] : "—"} description={CORE_EXPLANATIONS.ascendant[locale]} />
          <SummaryRow label={t("kundli.nakshatra")} value={calc.nakshatra ?? "—"} description={CORE_EXPLANATIONS.nakshatra[locale]} />
        </div>
      </div>

      {calc.planetaryPositions && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("kundli.planetaryPositions")}</CardTitle>
          </CardHeader>
          <CardContent className="scroll-x">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">Planet</th>
                  <th>Sign</th>
                  <th>House</th>
                  <th>Retrograde</th>
                </tr>
              </thead>
              <tbody>
                {calc.planetaryPositions.map((p) => (
                  <tr key={p.planet} className="border-t border-border">
                    <td className="py-2">{PLANET_LABELS[p.planet]?.[locale] ?? p.planet}</td>
                    <td>{ZODIAC_LABELS[p.sign][locale]}</td>
                    <td>{p.house ?? "—"}</td>
                    <td>{p.retrograde ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {calc.planetaryPositions && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("kundli.whatDoesThisMean")}</CardTitle>
            <CardDescription>{t("kundli.yourPlanetsExplained")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {calc.planetaryPositions.map((p) => (
              <p key={p.planet} className="border-t border-border pt-3 text-sm leading-relaxed first:border-t-0 first:pt-0">
                {buildPlanetInterpretation(p.planet, p.house, locale)}
              </p>
            ))}
          </CardContent>
          <CardFooter>
            <HouseMeaningsToggle locale={locale} />
          </CardFooter>
        </Card>
      )}

      {calc.dasha && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("kundli.dasha")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {calc.dasha.map((d) => (
              <div key={d.period} className="flex justify-between text-sm">
                <span>{d.period}</span>
                <span className="text-muted">{d.from} → {d.to}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {calc.sunSign && <KundliExplanationSection own={own} name={name} calc={calc} />}
    </>
  );
}

/**
 * "Explain my full kundli" — button-triggered (not auto-loaded, so it never
 * silently spends a credit) deep AI reading grounded in the real chart
 * above. Own-kundli explanations are cached server-side per locale
 * (/api/kundli/explain) — a repeat click after the first successful
 * generation just re-shows it locally within this session; a fresh page
 * load re-fetches instantly from cache without another credit charge.
 */
function KundliExplanationSection({ own, name, calc }: { own: boolean; name?: string; calc: Calculation }) {
  const t = useT();
  const { toast } = useToast();
  const [explanation, setExplanation] = useState<KundliExplanation | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const explain = useMutation({
    mutationFn: () =>
      apiFetch<{ explanation: KundliExplanation }>("/api/kundli/explain", {
        method: "POST",
        body: JSON.stringify({
          own,
          name,
          calculation: {
            sunSign: calc.sunSign,
            moonSign: calc.moonSign,
            ascendant: calc.ascendant,
            nakshatra: calc.nakshatra,
            planetaryPositions: calc.planetaryPositions,
          },
        }),
      }),
    onSuccess: (res) => setExplanation(res.explanation),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else if (err instanceof ApiError && err.status === 429) toast({ title: t("kundli.explainRateLimited"), variant: "danger" });
      else toast({ title: t("kundli.explainErrorGeneric"), variant: "danger" });
    },
  });

  if (!explanation) {
    return (
      <div className="mt-8 flex justify-center border-t border-border pt-8">
        <Button size="lg" onClick={() => explain.mutate()} disabled={explain.isPending}>
          <Sparkles size={16} />
          {explain.isPending ? t("kundli.explainLoading") : t("kundli.explainButton")}
        </Button>
        <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-border pt-8">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="mb-2">
            <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
          </div>
          <p className="text-sm leading-relaxed">{explanation.intro}</p>
        </CardContent>
      </Card>

      {explanation.sections.map((s, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span aria-hidden="true">{s.icon}</span> {s.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {s.paragraphs.map((p, pi) => (
              <p key={pi} className="text-sm leading-relaxed">
                {p}
              </p>
            ))}
            {s.bullets && s.bullets.length > 0 && (
              <ul className="ml-4 list-disc text-sm text-muted">
                {s.bullets.map((b, bi) => (
                  <li key={bi}>{b}</li>
                ))}
              </ul>
            )}
            {s.highlight && (
              <blockquote className="mt-1 rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm font-medium">
                {s.highlight}
              </blockquote>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span aria-hidden="true">🔥</span> {t("kundli.strongestCombinationTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {explanation.strongestCombination.points.map((p, i) => (
            <div key={i}>
              <p className="text-sm font-semibold">
                {i + 1}. {p.title}
              </p>
              <p className="text-xs text-muted">{p.desc}</p>
            </div>
          ))}
          <blockquote className="mt-1 rounded-lg border-l-4 border-gold bg-gold/5 px-3 py-2 text-sm italic">
            &ldquo;{explanation.strongestCombination.summary}&rdquo;
          </blockquote>
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span aria-hidden="true">⚠️</span> {t("kundli.challengesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ul className="ml-4 list-disc text-sm">
            {explanation.challenges.items.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p className="text-xs text-muted">{explanation.challenges.note}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("kundli.shortSummaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{explanation.shortSummary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function OthersLookupForm({ onCancel, onResult }: { onCancel: () => void; onResult: (res: LookupResponse) => void }) {
  const t = useT();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    birthTimeKnown: true,
    birthTime: "",
    birthCity: "",
    birthCountry: "India",
  });
  const [birthCoords, setBirthCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const lookup = useMutation({
    mutationFn: () =>
      apiFetch<LookupResponse>("/api/kundli/lookup", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          birthTime: form.birthTimeKnown ? form.birthTime || undefined : undefined,
          latitude: birthCoords?.latitude,
          longitude: birthCoords?.longitude,
        }),
      }),
    onSuccess: (res) => onResult(res),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) toast({ title: t("kundli.placeNotFound"), variant: "danger" });
      else if (err instanceof ApiError && err.status === 429) toast({ title: t("kundli.lookupRateLimited"), variant: "danger" });
      else toast({ title: t("kundli.lookupErrorGeneric"), variant: "danger" });
    },
  });

  const canSubmit = form.birthDate && form.birthCity.trim() && (!form.birthTimeKnown || form.birthTime);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("kundli.othersFormTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label={t("kundli.namePlaceholder")}>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label={t("kundli.birthDateLabel")}>
          <Input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        </Field>
        <Field label={t("kundli.birthTimeLabel")}>
          <Input
            type="time"
            value={form.birthTime}
            disabled={!form.birthTimeKnown}
            onChange={(e) => setForm((f) => ({ ...f, birthTime: e.target.value }))}
          />
          <label className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={form.birthTimeKnown}
              onChange={(e) => setForm((f) => ({ ...f, birthTimeKnown: e.target.checked }))}
            />
            {t("kundli.timeKnownLabel")}
          </label>
        </Field>
        <Field label={t("kundli.cityPlaceholder")}>
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
        <Field label={t("kundli.countryPlaceholder")}>
          <Input value={form.birthCountry} onChange={(e) => setForm((f) => ({ ...f, birthCountry: e.target.value }))} />
        </Field>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft size={14} /> {t("kundli.backToMine")}
        </Button>
        <Button onClick={() => lookup.mutate()} disabled={!canSubmit || lookup.isPending}>
          {lookup.isPending ? t("kundli.lookupLoading") : t("kundli.lookupSubmit")}
        </Button>
      </CardFooter>
    </Card>
  );
}

function SummaryRow({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{label}</span>
          <span className="text-sm font-semibold">{value}</span>
        </div>
        {description && <p className="mt-1.5 text-xs leading-relaxed text-muted">{description}</p>}
      </CardContent>
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

/** Reference legend for what each of the 12 houses represents — collapsed by default so the page doesn't get overwhelming, but always one click away from the per-planet explanations above it. */
function HouseMeaningsToggle({ locale }: { locale: AppLocale }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? t("kundli.hideHouseMeanings") : t("kundli.showHouseMeanings")}
      </Button>
      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(HOUSE_THEMES).map(([house, theme]) => (
            <div key={house} className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-xs font-semibold">{t("kundli.houseLabel", { n: house })}</p>
              <p className="text-xs text-muted">{theme[locale]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
