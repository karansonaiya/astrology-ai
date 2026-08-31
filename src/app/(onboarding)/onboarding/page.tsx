"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete, type PlaceSuggestion } from "@/components/ui/city-autocomplete";
import { useI18n, useT } from "@/lib/i18n/provider";
import { locales, localeLabels, type AppLocale } from "@/lib/i18n/config";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type Interest = "career" | "marriage" | "relationship" | "business" | "daily_guidance" | "compatibility" | "self_reflection";

const TOTAL_STEPS = 10;

export default function OnboardingPage() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [birthDate, setBirthDate] = useState("");
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [birthTime, setBirthTime] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthCountry, setBirthCountry] = useState("India");
  const [birthCoords, setBirthCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [interest, setInterest] = useState<Interest>("self_reflection");
  const [consent, setConsent] = useState(false);
  const [saveBirthDetails, setSaveBirthDetails] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          locale,
          name: name || undefined,
          gender,
          birthDate: birthDate || undefined,
          birthTimeKnown,
          birthTime: birthTimeKnown ? birthTime || undefined : undefined,
          birthCity: birthCity || undefined,
          birthCountry: birthCountry || undefined,
          latitude: birthCoords?.latitude,
          longitude: birthCoords?.longitude,
          primaryInterest: interest,
          ageConfirmed: true,
          saveBirthDetails: saveBirthDetails && !!birthDate,
          termsAccepted: true,
        }),
      });
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const interests: { key: Interest; label: string }[] = [
    { key: "career", label: t("onboarding.interestCareer") },
    { key: "marriage", label: t("onboarding.interestMarriage") },
    { key: "relationship", label: t("onboarding.interestRelationship") },
    { key: "business", label: t("onboarding.interestBusiness") },
    { key: "daily_guidance", label: t("onboarding.interestDaily") },
    { key: "compatibility", label: t("onboarding.interestCompatibility") },
    { key: "self_reflection", label: t("onboarding.interestSelfReflection") },
  ];

  return (
    <Card>
      <div className="px-6 pt-6">
        <Progress value={(step / TOTAL_STEPS) * 100} />
      </div>

      {step === 1 && (
        <Step title={t("onboarding.step1Title")} desc={t("onboarding.step1Desc")}>
          <div className="grid grid-cols-3 gap-2">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l as AppLocale)}
                className={cn(
                  "focus-ring rounded-xl border border-border bg-surface-raised px-3 py-4 text-sm font-medium",
                  locale === l && "border-primary text-primary"
                )}
              >
                {localeLabels[l]}
              </button>
            ))}
          </div>
        </Step>
      )}

      {step === 2 && <Step title={t("onboarding.step2Title")} desc={t("onboarding.step2Desc")} />}

      {step === 3 && (
        <Step title={t("onboarding.step3Title")}>
          <Input placeholder={t("onboarding.step3NamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
        </Step>
      )}

      {step === 4 && (
        <Step title={t("onboarding.step4Title")}>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female", "other", "prefer_not_to_say"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={cn(
                  "focus-ring rounded-xl border border-border bg-surface-raised px-3 py-3 text-sm capitalize",
                  gender === g && "border-primary text-primary"
                )}
              >
                {g === "prefer_not_to_say" ? t("onboarding.step4PreferNotToSay") : g}
              </button>
            ))}
          </div>
        </Step>
      )}

      {step === 5 && (
        <Step title={t("onboarding.step5Title")} desc={t("onboarding.step5Desc")}>
          <Label htmlFor="birthDate" className="sr-only">{t("onboarding.step5Title")}</Label>
          <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </Step>
      )}

      {step === 6 && (
        <Step title={t("onboarding.step6Title")} desc={t("onboarding.step6Desc")}>
          <label className="mb-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={!birthTimeKnown} onChange={(e) => setBirthTimeKnown(!e.target.checked)} />
            {t("onboarding.step6UnknownTime")}
          </label>
          {birthTimeKnown && <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />}
        </Step>
      )}

      {step === 7 && (
        <Step title={t("onboarding.step7Title")}>
          <CityAutocomplete
            value={birthCity}
            onChange={(text) => {
              setBirthCity(text);
              setBirthCoords(null); // typed away from the picked suggestion — re-geocode server-side on submit
            }}
            onSelect={(place: PlaceSuggestion) => {
              setBirthCountry(place.country);
              setBirthCoords({ latitude: place.latitude, longitude: place.longitude });
            }}
            placeholder={t("onboarding.step7Placeholder")}
          />
          <p className="mt-1.5 text-xs text-muted">{t("onboarding.step7Hint")}</p>
        </Step>
      )}

      {step === 8 && (
        <Step title={t("onboarding.step8Title")} desc={t("onboarding.step8Desc")}>
          <div className="grid grid-cols-2 gap-2">
            {interests.map((i) => (
              <button
                key={i.key}
                onClick={() => setInterest(i.key)}
                className={cn(
                  "focus-ring rounded-xl border border-border bg-surface-raised px-3 py-3 text-left text-sm",
                  interest === i.key && "border-primary text-primary"
                )}
              >
                {i.label}
              </button>
            ))}
          </div>
        </Step>
      )}

      {step === 9 && (
        <Step title={t("onboarding.step9Title")} desc={t("onboarding.step9Desc")}>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={saveBirthDetails} onChange={(e) => setSaveBirthDetails(e.target.checked)} />
            {birthDate ? t("onboarding.step9Consent") : t("onboarding.step9SkipStorage")}
          </label>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {t("auth.ageConfirm")}
          </label>
        </Step>
      )}

      {step === 10 && <Step title={t("onboarding.step10Title")} desc={t("onboarding.step10Desc")} />}

      <CardFooter className="justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 1}>
          {t("common.back")}
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onClick={next} disabled={step === 9 && !consent}>
            {t("common.next")}
          </Button>
        ) : (
          <Button onClick={finish} disabled={submitting}>
            {t("onboarding.goToDashboard")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function Step({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </>
  );
}
