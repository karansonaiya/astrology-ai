"use client";

import { useT } from "@/lib/i18n/provider";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">{t("legal.lastUpdated", { date: "26 August 2026" })}</p>
      <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        {t("legal.englishOnlyNotice")}
      </p>
      <div className="prose-legal mt-8 flex flex-col gap-5 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        {children}
      </div>
    </div>
  );
}
