"use client";

import { useI18n, useT } from "@/lib/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FESTIVALS_2026 } from "@/lib/content/festivals";
import { formatDate } from "@/lib/utils";
import { PageFaqSection } from "@/components/layout/page-faq-section";
import { FESTIVALS_FAQS } from "@/lib/content/page-faqs";

/**
 * A real, curated (not AI-invented, not live-computed) 2026 Hindu festival
 * calendar — see festivals.ts's header comment for sourcing. Grouped into
 * Upcoming / Past This Year against today's real date rather than a full
 * calendar-grid UI, since a simple chronological list is what someone
 * actually wants from "when is the next festival" — matches this app's
 * existing Month-view-is-secondary pattern on /panchang.
 */
export function FestivalsContent() {
  const t = useT();
  const { locale } = useI18n();

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = FESTIVALS_2026.filter((f) => f.date >= todayStr);
  const past = [...FESTIVALS_2026.filter((f) => f.date < todayStr)].reverse();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("festivals.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("festivals.subtitle")}</p>

      {upcoming.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("festivals.upcoming")}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {upcoming.map((f) => (
              <Card key={f.name}>
                <CardContent className="flex flex-col gap-1.5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{f.name}</p>
                    <div className="flex items-center gap-2">
                      {f.category === "vrat" && <Badge variant="default">{t("festivals.vrat")}</Badge>}
                      <span className="text-xs font-medium text-gold">{formatDate(f.date, `${locale}-IN`)}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{f.description[locale]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("festivals.pastThisYear")}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {past.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <span className="text-muted">{f.name}</span>
                <span className="text-xs text-muted">{formatDate(f.date, `${locale}-IN`)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-muted">{t("festivals.regionalNotice")}</p>

      <PageFaqSection faqs={FESTIVALS_FAQS} />
    </div>
  );
}
