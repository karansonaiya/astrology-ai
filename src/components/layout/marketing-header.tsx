"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { InstallButton } from "./install-button";
import { Logo } from "./logo";

export function MarketingHeader() {
  const t = useT();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/features", label: t("nav.features") },
    { href: "/horoscope", label: t("nav.dailyHoroscope") },
    { href: "/panchang", label: t("nav.panchang") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/faq", label: t("nav.faq") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <InstallButton />
          {session ? (
            <Button asChild size="sm">
              <Link href="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t("common.login")}</Link>
            </Button>
          )}
        </div>

        <button
          className="focus-ring rounded-lg p-2 lg:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-muted" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-2">
            <LanguageSwitcher className="flex-1" />
            <ThemeToggle />
          </div>
          <Button asChild className="mt-3 w-full">
            <Link href={session ? "/dashboard" : "/login"}>{session ? t("nav.dashboard") : t("common.login")}</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
