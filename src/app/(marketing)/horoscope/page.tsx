"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ZODIAC_LABELS, type ZodiacSign } from "@/lib/zodiac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { cn } from "@/lib/utils";

type HoroscopeResponse =
  | { published: false }
  | {
      published: true;
      content: {
        career: string;
        love: string;
        money: string;
        wellness: string;
        luckyColor: string;
        luckyNumber: string;
        reflection: string;
      };
    };

export default function HoroscopePage() {
  const t = useT();
  const { locale } = useI18n();
  const [sign, setSign] = useState<ZodiacSign>("aries");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const { data, isLoading } = useQuery({
    queryKey: ["horoscope", sign, period, locale],
    queryFn: () => apiFetch<HoroscopeResponse>(`/api/horoscope?sign=${sign}&period=${period}&locale=${locale}`),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{t("horoscope.title")}</h1>
      <p className="mt-2 text-muted">{t("horoscope.generalNotice")}</p>

      <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-12">
        {ZODIAC_SIGNS.map((s) => (
          <button
            key={s}
            onClick={() => setSign(s)}
            className={cn(
              "focus-ring flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-3 text-xs transition-colors",
              sign === s && "border-primary bg-primary/10 text-primary"
            )}
            aria-pressed={sign === s}
          >
            <span className="text-lg" aria-hidden="true">{ZODIAC_SYMBOLS[s]}</span>
            {ZODIAC_LABELS[s][locale]}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="daily">{t("horoscope.daily")}</TabsTrigger>
            <TabsTrigger value="weekly">{t("horoscope.weekly")}</TabsTrigger>
            <TabsTrigger value="monthly">{t("horoscope.monthly")}</TabsTrigger>
          </TabsList>

          <TabsContent value={period}>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : data && "published" in data && data.published ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>
                    {ZODIAC_SYMBOLS[sign]} {ZODIAC_LABELS[sign][locale]}
                  </CardTitle>
                  <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("horoscope.career")} value={data.content.career} />
                  <Field label={t("horoscope.love")} value={data.content.love} />
                  <Field label={t("horoscope.money")} value={data.content.money} />
                  <Field label={t("horoscope.wellness")} value={data.content.wellness} />
                  <Field label={t("horoscope.luckyColor")} value={data.content.luckyColor} />
                  <Field label={t("horoscope.luckyNumber")} value={data.content.luckyNumber} />
                  <div className="sm:col-span-2">
                    <Field label={t("horoscope.reflection")} value={data.content.reflection} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted">{t("horoscope.notPublished")}</CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-foreground/90">{value}</p>
    </div>
  );
}
