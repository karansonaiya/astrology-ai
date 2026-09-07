"use client";

import Link from "next/link";
import { useI18n, useT } from "@/lib/i18n/provider";
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ZODIAC_LABELS } from "@/lib/zodiac";
import { ZODIAC_PROFILES } from "@/lib/content/zodiac-profiles";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function BlogIndexPage() {
  const t = useT();
  const { locale } = useI18n();

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{t("blog.title")}</h1>
      <p className="mt-2 text-muted">{t("blog.subtitle")}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ZODIAC_SIGNS.map((sign) => {
          const profile = ZODIAC_PROFILES[sign];
          return (
            <Link key={sign} href={`/blog/${sign}`} className="block">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{ZODIAC_SYMBOLS[sign]}</span>
                    <CardTitle className="text-base">{ZODIAC_LABELS[sign][locale]}</CardTitle>
                  </div>
                  <CardDescription>
                    {profile.element[locale]} · {profile.rulingPlanet[locale]} · {profile.dateRange}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
