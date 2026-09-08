"use client";

import Link from "next/link";
import { useI18n, useT } from "@/lib/i18n/provider";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { Faq } from "@/lib/content/faqs";

/**
 * Drop this near the bottom of a public content page (panchang/horoscope/
 * blog) with that page's own topical FAQ set (see page-faqs.ts) — an SEO
 * pass specifically asked for a FAQ relevant to what someone landing on
 * THAT page actually wants to know, not just a link out to the general
 * app-wide /faq page. Two-column layout with click-to-expand answers,
 * each column its own independent accordion (any number of items open at
 * once) — a design reference the founder shared showed this exact pattern
 * (that reference's content was for an unrelated product; only the
 * layout/interaction is reused here).
 */
export function PageFaqSection({ faqs }: { faqs: Faq[] }) {
  const t = useT();
  const { locale } = useI18n();

  const mid = Math.ceil(faqs.length / 2);
  const left = faqs.slice(0, mid);
  const right = faqs.slice(mid);

  return (
    <div className="mt-14 border-t border-border pt-10">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-semibold text-primary">{t("landing.faqTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("landing.faqSubtitle")}</p>
      </div>

      <div className="mt-8 grid gap-x-8 sm:grid-cols-2">
        {[left, right].map((column, colIndex) => (
          <Accordion key={colIndex} type="multiple" className={colIndex === 1 ? "sm:border-l sm:border-border sm:pl-8" : ""}>
            {column.map((faq, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger>{faq.q[locale]}</AccordionTrigger>
                <AccordionContent>{faq.a[locale]}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link href="/faq" className="focus-ring text-sm font-medium text-primary hover:underline">
          {t("landing.viewAllFaqs")} &rarr;
        </Link>
      </div>
    </div>
  );
}
