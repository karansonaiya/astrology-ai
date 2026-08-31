"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sunrise, Sunset, Moon, Sparkles, TriangleAlert, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { cn } from "@/lib/utils";

type TimeWindow = { start: string; end: string };
type PanchangPeriod = { name: string; type: string; windows: TimeWindow[] };
type ChoghadiyaSlot = { name: string; type: string; start: string; end: string };
type PanchangData = {
  isDemoData: boolean;
  vaara: string | null;
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  tithi: PanchangPeriod[];
  nakshatra: PanchangPeriod[];
  yoga: PanchangPeriod[];
  karana: PanchangPeriod[];
  choghadiyaDay: ChoghadiyaSlot[];
  choghadiyaNight: ChoghadiyaSlot[];
  auspicious: PanchangPeriod[];
  inauspicious: PanchangPeriod[];
};
type PanchangResponse = { city: string; country: string; date: string; panchang: PanchangData };
type MonthResponse = { city: string; country: string; year: number; month: number; days: Record<string, PanchangData | null> };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PanchangPage() {
  const t = useT();
  const [view, setView] = useState<"day" | "month">("day");
  const [city, setCity] = useState("Ahmedabad");
  const [country, setCountry] = useState("India");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [date, setDate] = useState(todayISO());
  const [query, setQuery] = useState({ city: "Ahmedabad", country: "India", date: todayISO(), coords: null as { latitude: number; longitude: number } | null });

  const showDay = (isoDate: string) => {
    setDate(isoDate);
    setQuery((q) => ({ ...q, date: isoDate }));
    setView("day");
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["panchang", query.city, query.country, query.date, query.coords?.latitude, query.coords?.longitude],
    queryFn: () =>
      apiFetch<PanchangResponse>(
        `/api/panchang?${new URLSearchParams({
          city: query.city,
          country: query.country,
          date: query.date,
          ...(query.coords ? { latitude: String(query.coords.latitude), longitude: String(query.coords.longitude) } : {}),
        })}`
      ),
    enabled: view === "day",
  });

  const errorMessage =
    error instanceof ApiError && error.status === 422
      ? t("panchang.placeNotFound")
      : error instanceof ApiError && error.status === 429
        ? t("panchang.rateLimited")
        : t("panchang.errorGeneric");

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{t("panchang.title")}</h1>
      <p className="mt-2 text-muted">{t("panchang.subtitle")}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ city, country, date, coords });
        }}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="w-48">
          <Label className="mb-1.5 block">{t("panchang.cityLabel")}</Label>
          <CityAutocomplete
            value={city}
            onChange={(text) => {
              setCity(text);
              setCoords(null);
            }}
            onSelect={(place) => {
              setCountry(place.country);
              setCoords({ latitude: place.latitude, longitude: place.longitude });
            }}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} className="w-32" />
        </div>
        {view === "day" && (
          <div>
            <Label className="mb-1.5 block">{t("panchang.dateLabel")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>
        )}
        <Button type="submit">{t("common.submit")}</Button>
        {view === "day" && (
          <Button type="button" variant="outline" onClick={() => showDay(todayISO())}>
            {t("panchang.today")}
          </Button>
        )}
      </form>

      <Tabs value={view} onValueChange={(v) => setView(v as "day" | "month")} className="mt-6">
        <TabsList>
          <TabsTrigger value="day">{t("panchang.dayView")}</TabsTrigger>
          <TabsTrigger value="month">{t("panchang.monthView")}</TabsTrigger>
        </TabsList>

        <TabsContent value="day">
          {isLoading ? (
            <div className="mt-8 flex flex-col gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : isError ? (
            <Card className="mt-8">
              <CardContent className="py-10 text-center text-muted">{errorMessage}</CardContent>
            </Card>
          ) : data ? (
            <div className="mt-8 flex flex-col gap-6">
              <TodayCard data={data} />
              <FourUpGrid p={data.panchang} />
              <ChoghadiyaSection p={data.panchang} />
              <div className="grid gap-6 md:grid-cols-2">
                <MuhuratCard
                  title={t("panchang.auspiciousTitle")}
                  subtitle={t("panchang.auspiciousSubtitle")}
                  icon={<Sparkles size={18} className="text-gold" />}
                  periods={data.panchang.auspicious}
                  tone="gold"
                />
                <MuhuratCard
                  title={t("panchang.inauspiciousTitle")}
                  subtitle={t("panchang.inauspiciousSubtitle")}
                  icon={<TriangleAlert size={18} className="text-danger" />}
                  periods={data.panchang.inauspicious}
                  tone="danger"
                />
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="month">
          <MonthView city={query.city} country={query.country} coords={query.coords} onSelectDay={showDay} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MonthView({
  city,
  country,
  coords,
  onSelectDay,
}: {
  city: string;
  country: string;
  coords: { latitude: number; longitude: number } | null;
  onSelectDay: (isoDate: string) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const { data, isLoading, isError } = useQuery({
    queryKey: ["panchang-month", city, country, year, month, coords?.latitude, coords?.longitude],
    queryFn: () =>
      apiFetch<MonthResponse>(
        `/api/panchang/month?${new URLSearchParams({
          city,
          country,
          year: String(year),
          month: String(month),
          ...(coords ? { latitude: String(coords.latitude), longitude: String(coords.longitude) } : {}),
        })}`
      ),
  });

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const localeTag = { en: "en-IN", hi: "hi-IN", gu: "gu-IN" }[locale];
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(localeTag, { month: "long", year: "numeric" });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, i + 7).toLocaleDateString(localeTag, { weekday: "short" }) // 2024-01-07 was a Sunday
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sunday
  const todayStr = todayISO();

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <p className="font-heading text-lg font-semibold">{monthLabel}</p>
        <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => changeMonth(1)}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">{t("panchang.errorGeneric")}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {isLoading
            ? Array.from({ length: daysInMonth }, (_, i) => <Skeleton key={i} className="h-20" />)
            : Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayData = data?.days[dateStr];
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => onSelectDay(dateStr)}
                    className={cn(
                      "focus-ring flex h-20 flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition-colors hover:border-primary/40 sm:h-24 sm:p-2",
                      isToday ? "border-primary bg-primary/10" : "border-border bg-surface"
                    )}
                  >
                    <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{day}</span>
                    {dayData ? (
                      <>
                        <span className="line-clamp-1 text-[10px] text-muted">{dayData.tithi[0]?.name ?? "—"}</span>
                        <span className="line-clamp-1 text-[10px] text-muted">{dayData.nakshatra[0]?.name ?? "—"}</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted">…</span>
                    )}
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}

function TodayCard({ data }: { data: PanchangResponse }) {
  const t = useT();
  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <CardTitle className="text-base">
            {data.panchang.vaara ?? "—"} · {data.city}, {data.country} · {data.date}
          </CardTitle>
        </div>
        {data.panchang.isDemoData ? (
          <Badge variant="gold">{t("panchang.demoDataNotice")}</Badge>
        ) : (
          <Badge variant="success">{t("panchang.calculatedNotice")}</Badge>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SunMoonStat icon={<Sunrise size={18} className="text-gold" />} label={t("panchang.sunrise")} value={data.panchang.sunrise} />
        <SunMoonStat icon={<Sunset size={18} className="text-primary" />} label={t("panchang.sunset")} value={data.panchang.sunset} />
        <SunMoonStat icon={<Moon size={18} className="text-muted" />} label={t("panchang.moonrise")} value={data.panchang.moonrise} />
        <SunMoonStat icon={<Moon size={18} className="text-muted" />} label={t("panchang.moonset")} value={data.panchang.moonset} />
      </CardContent>
    </Card>
  );
}

function SunMoonStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-3 py-4 text-center">
      {icon}
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold">{value ?? "—"}</span>
    </div>
  );
}

function FourUpGrid({ p }: { p: PanchangData }) {
  const t = useT();
  const items: { label: string; periods: PanchangPeriod[] }[] = [
    { label: t("panchang.tithi"), periods: p.tithi },
    { label: t("panchang.nakshatra"), periods: p.nakshatra },
    { label: t("panchang.yoga"), periods: p.yoga },
    { label: t("panchang.karana"), periods: p.karana },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">{item.label}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {item.periods.length === 0 && <span className="text-sm text-muted">—</span>}
            {item.periods.map((period, i) => (
              <div key={`${period.name}-${i}`}>
                <p className="text-sm font-semibold">{period.name}</p>
                {period.windows.map((w, wi) => (
                  <p key={wi} className="text-xs text-muted">
                    {w.start} → {w.end}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const CHOGHADIYA_TONE: Record<string, string> = {
  "Most Auspicious": "border-success/40 bg-success/10 text-success",
  Good: "border-success/25 bg-success/5 text-success",
  Auspicious: "border-success/25 bg-success/5 text-success",
  Inauspicious: "border-danger/30 bg-danger/5 text-danger",
};

function ChoghadiyaSection({ p }: { p: PanchangData }) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("panchang.choghadiyaTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ChoghadiyaRow label={t("panchang.choghadiyaDay")} slots={p.choghadiyaDay} />
        <ChoghadiyaRow label={t("panchang.choghadiyaNight")} slots={p.choghadiyaNight} />
      </CardContent>
    </Card>
  );
}

function ChoghadiyaRow({ label, slots }: { label: string; slots: ChoghadiyaSlot[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {slots.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className={cn("rounded-lg border px-3 py-2 text-center", CHOGHADIYA_TONE[s.type] ?? "border-border bg-surface")}
          >
            <p className="text-sm font-semibold">{s.name}</p>
            <p className="text-[11px] opacity-80">
              {s.start} → {s.end}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MuhuratCard({
  title,
  subtitle,
  icon,
  periods,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  periods: PanchangPeriod[];
  tone: "gold" | "danger";
}) {
  return (
    <Card className={cn(tone === "gold" ? "border-gold/30" : "border-danger/30")}>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        {icon}
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {periods.map((period, i) => (
          <div key={`${period.name}-${i}`} className="flex items-center justify-between border-t border-border pt-2 first:border-t-0 first:pt-0">
            <span className="text-sm font-medium">{period.name}</span>
            <span className="text-xs text-muted">{period.windows.map((w) => `${w.start}–${w.end}`).join(", ")}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
