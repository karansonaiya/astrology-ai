"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, ShieldCheck, Languages, ReceiptText, MessageCircle, Sun, GitCompareArrows, FileText } from "lucide-react";
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

const TRUST_ICONS = [ShieldCheck, Languages, ReceiptText, Sparkles];

/**
 * The one no-login-required way for a site visitor to actually try Prerna AI
 * before signing up — everything else ("Ask Prerna AI" chat, kundli, etc.) is
 * behind auth (see middleware.ts PROTECTED_PREFIXES). Rate-limited by IP at
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

export default function LandingPage() {
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

  // Shared with the dedicated /faq page (src/lib/content/faqs.ts) so the two
  // never drift — the homepage shows the first 4 as a teaser, with a "View
  // all FAQs" link below for the rest, rather than dumping all 8 here.
  const faqs = FAQS.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-6 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {trustChips.map((chip, i) => {
                const Icon = TRUST_ICONS[i];
                return (
                  <Badge key={chip} variant="default">
                    <Icon size={12} /> {chip}
                  </Badge>
                );
              })}
            </div>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-foreground md:text-5xl">
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
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Card className="glass overflow-hidden">
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

      {/* How it works */}
      <section className="border-t border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("landing.howItWorksTitle")}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title}>
                <CardHeader>
                  <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
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
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("landing.featuresTitle")}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <f.icon size={22} className="mb-2 text-gold" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Language + privacy */}
      <section className="border-t border-border bg-surface/40 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:px-6">
          <Card>
            <CardHeader>
              <Languages size={22} className="mb-2 text-primary" />
              <CardTitle>{t("landing.languageSectionTitle")}</CardTitle>
              <CardDescription>{t("landing.languageSectionDesc")}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck size={22} className="mb-2 text-success" />
              <CardTitle>{t("landing.privacySectionTitle")}</CardTitle>
              <CardDescription>{t("landing.privacySectionDesc")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("landing.pricingSectionTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{t("landing.pricingSectionDesc")}</p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/pricing">{t("nav.pricing")}</Link>
          </Button>
        </div>
      </section>

      {/* Testimonials (clearly-marked demo placeholders) */}
      <section className="border-t border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("landing.testimonialsTitle")}</h2>
          <p className="mt-2 text-sm text-muted">{t("landing.testimonialsNote")}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-5">
                  <Badge className="mb-3">Demo placeholder</Badge>
                  <p className="text-sm text-foreground/90">
                    &ldquo;Exploring the career reflection feature before an important decision.&rdquo;
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("landing.faqTitle")}</h2>
          <div className="mt-6 flex flex-col gap-4">
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
      <section className="border-t border-border py-16">
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
