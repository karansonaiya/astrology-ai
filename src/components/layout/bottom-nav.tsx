"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Sparkles, FileText, Menu } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { href: "/chat", icon: MessageCircle, label: t("nav.chat") },
    { href: "/kundli", icon: Sparkles, label: t("nav.kundli") },
    { href: "/reports", icon: FileText, label: t("nav.reports") },
    { href: "/settings", icon: Menu, label: t("nav.settings") },
  ];

  return (
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
    </nav>
  );
}
