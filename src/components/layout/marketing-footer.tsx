"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { Logo } from "./logo";

export function MarketingFooter() {
  const t = useT();

  const columns = [
    {
      title: t("footer.product"),
      links: [
        { href: "/how-it-works", label: t("nav.howItWorks") },
        { href: "/features", label: t("nav.features") },
        { href: "/horoscope", label: t("nav.dailyHoroscope") },
        { href: "/panchang", label: t("nav.panchang") },
        { href: "/pricing", label: t("nav.pricing") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { href: "/faq", label: t("nav.faq") },
        { href: "/contact", label: t("nav.contact") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/safety", label: t("nav.safety") },
        { href: "/privacy", label: t("nav.privacy") },
        { href: "/terms", label: t("nav.terms") },
        { href: "/refund-policy", label: t("nav.refund") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">{t("landing.footerTagline")}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted">
          © {new Date().getFullYear()} Prerna AI. {t("landing.footerRights")}
        </div>
      </div>
    </footer>
  );
}
