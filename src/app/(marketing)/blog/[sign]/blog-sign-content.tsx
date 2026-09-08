"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useI18n, useT } from "@/lib/i18n/provider";
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ZODIAC_LABELS, type ZodiacSign } from "@/lib/zodiac";
import { ZODIAC_PROFILES } from "@/lib/content/zodiac-profiles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function BlogSignContent({ params }: { params: Promise<{ sign: string }> }) {
  const { sign } = use(params);
  const t = useT();
  const { locale } = useI18n();

  if (!(ZODIAC_SIGNS as readonly string[]).includes(sign)) notFound();
  const zodiacSign = sign as ZodiacSign;
  const profile = ZODIAC_PROFILES[zodiacSign];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <Link href="/blog" className="focus-ring text-sm text-muted hover:text-foreground">
        &larr; {t("blog.backToBlog")}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">{ZODIAC_SYMBOLS[zodiacSign]}</span>
        <h1 className="font-heading text-3xl font-semibold">{ZODIAC_LABELS[zodiacSign][locale]}</h1>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-3">
        <Fact label={t("blog.element")} value={profile.element[locale]} />
        <Fact label={t("blog.rulingPlanet")} value={profile.rulingPlanet[locale]} />
        <Fact label={t("blog.dateRange")} value={profile.dateRange} />
        <Fact label={t("blog.luckyColor")} value={profile.luckyColor[locale]} />
        <Fact label={t("blog.luckyNumber")} value={profile.luckyNumber} />
      </div>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <h2 className="font-heading text-lg font-semibold">{t("blog.traitsTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{profile.traits[locale]}</p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-5">
          <h2 className="font-heading text-lg font-semibold">{t("blog.compatibleWith")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.compatibleWith.map((s) => (
              <Link
                key={s}
                href={`/blog/${s}`}
                className="focus-ring flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40"
              >
                <span aria-hidden="true">{ZODIAC_SYMBOLS[s]}</span> {ZODIAC_LABELS[s][locale]}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-5">
          <h2 className="font-heading text-lg font-semibold">{t("blog.namingLetters")}</h2>
          <p className="mt-2 text-sm font-medium text-foreground">{profile.namingLetters}</p>
          <p className="mt-1.5 text-xs text-muted">{t("blog.namingLettersNote")}</p>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Button asChild>
          <Link href={`/horoscope?sign=${zodiacSign}`}>{t("blog.seeYourHoroscope")}</Link>
        </Button>
      </div>
    </div>
  );
}
