"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as RadixDialog from "@radix-ui/react-dialog";
import {
  Home, MessageCircle, Sparkles, FileText, Menu, X,
  User, Sun, GitCompareArrows, Briefcase, Heart, Wallet, CreditCard, Gift, Settings, LifeBuoy,
} from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

// Found live: the primary 5 tabs only ever covered Dashboard/Chat/Kundli/
// Reports/Settings — every other sidebar section (Profile, Daily Horoscope,
// Compatibility, Career, Relationship, Credits, Payments, Referral, Help)
// had NO way to be reached on mobile at all (no link to them anywhere on
// screen, and Settings itself doesn't link out to them either) — a mobile
// visitor could only ever get to them by typing the URL directly. The 5th
// tab is now "More", opening a bottom sheet with the full remaining list —
// same items AppSidebar shows on desktop — instead of being a dead end.
const MORE_ITEMS = [
  { href: "/profile", icon: User, labelKey: "nav.profile" },
  { href: "/horoscope", icon: Sun, labelKey: "nav.dailyHoroscope" },
  { href: "/compatibility", icon: GitCompareArrows, labelKey: "nav.compatibility" },
  { href: "/career", icon: Briefcase, labelKey: "nav.career" },
  { href: "/relationship", icon: Heart, labelKey: "nav.relationship" },
  { href: "/credits", icon: Wallet, labelKey: "nav.credits" },
  { href: "/payments", icon: CreditCard, labelKey: "nav.payments" },
  { href: "/referral", icon: Gift, labelKey: "nav.referral" },
  { href: "/settings", icon: Settings, labelKey: "nav.settings" },
  { href: "/help", icon: LifeBuoy, labelKey: "nav.help" },
];

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = [
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { href: "/chat", icon: MessageCircle, label: t("nav.chat") },
    { href: "/kundli", icon: Sparkles, label: t("nav.kundli") },
    { href: "/reports", icon: FileText, label: t("nav.reports") },
  ];

  const moreActive = MORE_ITEMS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <>
      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border px-2 py-2 md:hidden">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px]",
                active ? "text-primary" : "text-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "focus-ring flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px]",
            moreActive ? "text-primary" : "text-muted"
          )}
        >
          <Menu size={20} />
          {t("nav.more")}
        </button>
      </nav>

      <RadixDialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out md:hidden" />
          <RadixDialog.Content
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 pb-8 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom md:hidden"
          >
            <div className="mb-4 flex items-center justify-between">
              <RadixDialog.Title className="font-heading text-base font-semibold">{t("nav.more")}</RadixDialog.Title>
              <RadixDialog.Close className="focus-ring rounded p-1 text-muted hover:text-foreground" aria-label={t("common.cancel")}>
                <X size={18} />
              </RadixDialog.Close>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "focus-ring flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-[11px]",
                      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted hover:bg-background"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon size={20} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </>
  );
}
