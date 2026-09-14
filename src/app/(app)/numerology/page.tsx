"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Hash } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";

type NumerologyMeaning = { number: number; title: string; meaning: string };
type NumerologyReading = {
  lifePath: NumerologyMeaning;
  destiny: NumerologyMeaning;
  soulUrge: NumerologyMeaning;
  personality: NumerologyMeaning;
  birthday: NumerologyMeaning;
  summary: string;
};

export default function NumerologyPage() {
  const t = useT();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [reading, setReading] = useState<NumerologyReading | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const calculate = useMutation({
    mutationFn: () => apiFetch<{ reading: NumerologyReading }>("/api/numerology", { method: "POST", body: JSON.stringify({ name, birthDate }) }),
    onSuccess: (res) => setReading(res.reading),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
    },
  });

  const rows = reading
    ? [
        { key: "lifePath", label: t("numerology.lifePath"), item: reading.lifePath },
        { key: "destiny", label: t("numerology.destiny"), item: reading.destiny },
        { key: "soulUrge", label: t("numerology.soulUrge"), item: reading.soulUrge },
        { key: "personality", label: t("numerology.personality"), item: reading.personality },
        { key: "birthday", label: t("numerology.birthday"), item: reading.birthday },
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Hash size={22} className="text-primary" /> {t("numerology.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("numerology.subtitle")}</p>

      {!reading && (
        <Card className="mt-6">
          <CardContent className="grid gap-3 pt-5">
            <div>
              <Label htmlFor="num-name">{t("numerology.fullName")}</Label>
              <Input id="num-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="num-dob">{t("numerology.birthDate")}</Label>
              <Input id="num-dob" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1.5" />
            </div>
            <Button
              className="mt-2 w-fit"
              disabled={!name.trim() || !birthDate || calculate.isPending}
              onClick={() => calculate.mutate()}
            >
              <Sparkles size={16} />
              {calculate.isPending ? t("numerology.calculating") : t("numerology.calculate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {calculate.isPending && <Skeleton className="mt-4 h-40" />}

      {reading && (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="mb-2">
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
              </div>
              <p className="text-sm leading-relaxed">{reading.summary}</p>
            </CardContent>
          </Card>

          {rows.map((r) => (
            <Card key={r.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {r.item.number}
                  </span>
                  {r.label} — {r.item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{r.item.meaning}</p>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-fit" onClick={() => setReading(null)}>
            {t("numerology.startOver")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
