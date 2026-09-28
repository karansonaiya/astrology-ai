"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  ShieldCheck,
  Languages,
  ReceiptText,
  MessageCircle,
  Sun,
  GitCompareArrows,
  FileText,
  Quote,
  Star,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { CaptchaWidget } from "@/components/ui/captcha-widget";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { FAQS } from "@/lib/content/faqs";
import { SectionBadge } from "@/components/marketing/section-badge";
import { ZodiacWheel } from "@/components/marketing/zodiac-wheel";
import { PERSONAS } from "@/lib/personas/catalog";

const TRUST_ICONS = [ShieldCheck, Languages, ReceiptText, Sparkles];

/**
 * The one no-login-required way for a site visitor to actually try Prerna AI
 * before signing up — everything else ("Ask Prerna AI" chat, kundli, etc.) is
 * behind auth (see proxy.ts PROTECTED_PREFIXES). Rate-limited by IP at
 * /api/public/ask (3/day, no credit-system ties — there's no account yet).
 */
function PublicAskWidget() {
  const t = useT();
  const { locale } = useI18n();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const ask = useMutation({
    mutationFn: () =>
      apiFetch<{ text: string }>("/api/public/ask", { method: "POST", body: JSON.stringify({ question, locale, captchaToken }) }),
    onSuccess: (res) => setAnswer(res.text),
    onError: (err) => setRateLimited(err instanceof ApiError && err.status === 429),
  });

  if (answer) {
    return (
      <>
        <AiMarkdown content={answer} className="text-foreground/90" />
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted">{t("landing.publicAskCta")}</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/login">{t("landing.publicAskCtaButton")}</Link>
          </Button>
        </div>
      </>
    );
  }

  if (rateLimited) {
    return (
      <>
        <p className="text-sm text-muted">{t("landing.publicAskRateLimited")}</p>
        <Button asChild size="sm" className="mt-3">
          <Link href="/login">{t("landing.publicAskCtaButton")}</Link>
        </Button>
      </>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (question.trim() && !ask.isPending) ask.mutate();
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t("landing.publicAskPlaceholder")}
        className="min-h-20"
        maxLength={500}
      />
      <CaptchaWidget onVerify={setCaptchaToken} />
      <Button
        type="submit"
        disabled={!question.trim() || ask.isPending || (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER === "turnstile" && !captchaToken)}
      >
        {ask.isPending ? t("landing.publicAskLoading") : t("landing.publicAskSubmit")}
      </Button>
      {ask.isError && !rateLimited && <p className="text-xs text-danger">{t("landing.publicAskErrorGeneric")}</p>}
    </form>
  );
}

export function LandingContent() {
  const t = useT();
  const { locale } = useI18n();

  const trustChips = [t("landing.trustPrivate"), t("landing.trustLanguages"), t("landing.trustPricing"), t("landing.trustAi")];

  const steps = [
    { title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  const features = [
    { icon: MessageCircle, title: t("landing.featureChatTitle"), desc: t("landing.featureChatDesc") },
    { icon: Sun, title: t("landing.featureHoroscopeTitle"), desc: t("landing.featureHoroscopeDesc") },
    { icon: Sparkles, title: t("landing.featureKundliTitle"), desc: t("landing.featureKundliDesc") },
    { icon: GitCompareArrows, title: t("landing.featureCompatibilityTitle"), desc: t("landing.featureCompatibilityDesc") },
    { icon: FileText, title: t("landing.featureReportsTitle"), desc: t("landing.featureReportsDesc") },
    { icon: Languages, title: t("landing.featureLanguageTitle"), desc: t("landing.featureLanguageDesc") },
  ];

  // Real AI astrologer personas (src/lib/personas/catalog.ts), not fabricated
  // profiles — same portraits/names/taglines the actual persona picker uses.
  const astrologerPreview = PERSONAS.slice(0, 4);

  // Shared with the dedicated /faq page (src/lib/content/faqs.ts) so the two
  // never drift — the homepage shows the first 4 as a teaser, with a "View
  // all FAQs" link below for the rest, rather than dumping all 8 here.
  const faqs = FAQS.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="cosmic-bg relative overflow-hidden border-b border-border px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionBadge>{t("landing.heroEyebrow")}</SectionBadge>
            <h1 className="mt-5 font-heading text-3xl font-semibold leading-[1.1] text-foreground md:text-5xl lg:text-6xl">
              {t("landing.heroHeading")}
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted md:text-lg">{t("landing.heroSub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">{t("common.tryJyotiAi")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/horoscope">{t("common.exploreDailyHoroscope")}</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {trustChips.map((chip, i) => {
                const Icon = TRUST_ICONS[i];
                return (
                  <Badge key={chip} variant="gold">
                    <Icon size={12} /> {chip}
                  </Badge>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            {/* Floating feature pills, echoing the reference's collage
                treatment — real feature names, not decorative filler. Hidden
                below lg: at hero width, cramming these onto a narrow column
                clips or overlaps the actual widget instead of adding polish. */}
            <div className="pointer-events-none absolute -left-8 top-4 z-10 hidden -rotate-6 lg:block">
              <Badge className="border border-border bg-surface px-3 py-1.5 text-foreground shadow-md">
                <Sparkles size={12} className="text-gold" /> {t("landing.featureKundliTitle")}
              </Badge>
            </div>
            <div className="pointer-events-none absolute -right-6 top-20 z-10 hidden rotate-3 lg:block">
              <Badge className="border border-border bg-surface px-3 py-1.5 text-foreground shadow-md">
                <Sun size={12} className="text-gold" /> {t("landing.featureHoroscopeTitle")}
              </Badge>
            </div>
            <div className="pointer-events-none absolute -left-10 bottom-8 z-10 hidden rotate-3 lg:block">
              <Badge className="border border-border bg-surface px-3 py-1.5 text-foreground shadow-md">
                <GitCompareArrows size={12} className="text-gold" /> {t("landing.featureCompatibilityTitle")}
              </Badge>
            </div>

            <Card className="glass relative overflow-hidden shadow-xl">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{t("landing.publicAskTitle")}</CardTitle>
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
              </CardHeader>
              <CardContent>
                <PublicAskWidget />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionBadge>{t("landing.aboutEyebrow")}</SectionBadge>
            <h2 className="mt-4 font-heading text-2xl font-semibold md:text-3xl">{t("landing.aboutTitle")}</h2>
            <p className="mt-4 leading-relaxed text-muted">{t("landing.aboutBody")}</p>
          </div>
          <div className="order-first flex justify-center lg:order-last">
            <ZodiacWheel size={320} className="h-auto w-full max-w-[240px] md:max-w-[320px]" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-surface/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionBadge>{t("landing.howItWorksEyebrow")}</SectionBadge>
          <h2 className="mt-4 font-heading text-2xl font-semibold md:text-3xl">{t("landing.howItWorksTitle")}</h2>
          <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title} className="border-none bg-surface shadow-sm">
                <CardHeader>
                  <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-base font-semibold text-gold">
                    {i + 1}
                  </span>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <CardDescription>{s.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionBadge>{t("landing.featuresEyebrow")}</SectionBadge>
          <h2 className="mt-4 font-heading text-2xl font-semibold md:text-3xl">{t("landing.featuresTitle")}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 md:mt-10 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-tan/40 text-tan-foreground">
                    <f.icon size={20} />
                  </span>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Astrologers */}
      <section className="border-t border-border bg-surface/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionBadge>{t("landing.astrologersEyebrow")}</SectionBadge>
              <h2 className="mt-4 max-w-xl font-heading text-2xl font-semibold md:text-3xl">{t("landing.astrologersTitle")}</h2>
              <p className="mt-3 max-w-xl text-muted">{t("landing.astrologersSub")}</p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/login">{t("landing.astrologersCta")}</Link>
            </Button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:mt-10 lg:grid-cols-4">
            {astrologerPreview.map((persona) => (
              <Card key={persona.code} className="overflow-hidden">
                <div className="relative aspect-[3/4] w-full bg-surface-raised">
                  <Image
                    src={persona.avatarImage}
                    alt={persona.name}
                    fill
                    sizes="(min-width: 1024px) 240px, 45vw"
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <p className="font-heading text-sm font-semibold">{persona.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{persona.tagline}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Language + privacy */}
      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:px-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Languages size={20} />
              </span>
              <CardTitle>{t("landing.languageSectionTitle")}</CardTitle>
              <CardDescription>{t("landing.languageSectionDesc")}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
                <ShieldCheck size={20} />
              </span>
              <CardTitle>{t("landing.privacySectionTitle")}</CardTitle>
              <CardDescription>{t("landing.privacySectionDesc")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border bg-surface/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
          <SectionBadge>{t("landing.pricingEyebrow")}</SectionBadge>
          <h2 className="mt-4 font-heading text-2xl font-semibold md:text-3xl">{t("landing.pricingSectionTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t("landing.pricingSectionDesc")}</p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/pricing">{t("nav.pricing")}</Link>
          </Button>
        </div>
      </section>

      {/* Testimonials (clearly-marked demo placeholders) */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionBadge>{t("landing.testimonialsEyebrow")}</SectionBadge>
          <h2 className="mt-4 font-heading text-2xl font-semibold md:text-3xl">{t("landing.testimonialsTitle")}</h2>
          <p className="mt-2 text-sm text-muted">{t("landing.testimonialsNote")}</p>
          <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <Quote size={18} className="text-gold" />
                    <div className="flex gap-0.5 text-gold">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={12} fill="currentColor" strokeWidth={0} />
                      ))}
                    </div>
                  </div>
                  <Badge className="mt-3">Demo placeholder</Badge>
                  <p className="mt-3 text-sm text-foreground/90">
                    &ldquo;Exploring the career reflection feature before an important decision.&rdquo;
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-surface/40 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <SectionBadge>{t("landing.faqEyebrow")}</SectionBadge>
          <h2 className="mt-4 font-heading text-2xl font-semibold md:text-3xl">{t("landing.faqTitle")}</h2>
          <div className="mt-8 flex flex-col gap-4">
            {faqs.map((f) => (
              <Card key={f.q.en}>
                <CardHeader>
                  <CardTitle className="text-base">{f.q[locale]}</CardTitle>
                  <CardDescription>{f.a[locale]}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link href="/faq">{t("landing.viewAllFaqs")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("landing.finalCtaTitle")}</h2>
          <p className="mt-3 text-muted">{t("landing.finalCtaSub")}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/login">{t("common.tryJyotiAi")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
