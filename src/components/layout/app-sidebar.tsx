"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, MessageCircle, Users, User, Sun, Sparkles, GitCompareArrows, Briefcase, Heart,
  FileText, Wallet, CreditCard, Gift, Settings, LifeBuoy,
} from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function AppSidebar() {
  const t = useT();
  const pathname = usePathname();

  const groups = [
    {
      items: [
        { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
        { href: "/chat", icon: MessageCircle, label: t("nav.chat") },
        // Direct link to the persona-picker (src/app/(app)/chat/personas) —
        // previously only reachable via a "+ New chat" button buried inside
        // the chat page itself, which a founder testing the app couldn't
        // find.
        { href: "/chat/personas", icon: Users, label: t("nav.personas") },
      ],
    },
    {
      title: t("nav.kundli"),
      items: [
        { href: "/profile", icon: User, label: t("nav.profile") },
        { href: "/horoscope", icon: Sun, label: t("nav.dailyHoroscope") },
        { href: "/kundli", icon: Sparkles, label: t("nav.kundli") },
        { href: "/compatibility", icon: GitCompareArrows, label: t("nav.compatibility") },
        { href: "/career", icon: Briefcase, label: t("nav.career") },
        { href: "/relationship", icon: Heart, label: t("nav.relationship") },
      ],
    },
    {
      title: t("nav.reports"),
      items: [
        { href: "/reports", icon: FileText, label: t("nav.reports") },
        { href: "/credits", icon: Wallet, label: t("nav.credits") },
        { href: "/payments", icon: CreditCard, label: t("nav.payments") },
        { href: "/referral", icon: Gift, label: t("nav.referral") },
      ],
    },
    {
      items: [
        { href: "/settings", icon: Settings, label: t("nav.settings") },
        { href: "/help", icon: LifeBuoy, label: t("nav.help") },
      ],
    },
  ];

  // Longest-matching-prefix wins, so "/chat/personas" is active on its own
  // route rather than also lighting up its parent "/chat" link (both would
  // otherwise match via the startsWith check below).
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border p-5 md:flex">
      <Logo className="mb-6" />
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.title && <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.title}</p>}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface hover:text-foreground"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
