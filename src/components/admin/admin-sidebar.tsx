"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, RotateCcw, Cpu, TriangleAlert,
  FileText, DollarSign, Gift, LifeBuoy, ToggleLeft, BarChart3, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "support_agent", "content_editor"] },
  { href: "/admin/users", icon: Users, label: "Users", roles: ["admin", "support_agent"] },
  { href: "/admin/payments", icon: CreditCard, label: "Payments", roles: ["admin", "support_agent"] },
  { href: "/admin/refunds", icon: RotateCcw, label: "Refunds", roles: ["admin"] },
  { href: "/admin/ai-usage", icon: Cpu, label: "AI Usage & Cost", roles: ["admin"] },
  { href: "/admin/flagged", icon: TriangleAlert, label: "Flagged", roles: ["admin", "support_agent"] },
  { href: "/admin/content", icon: FileText, label: "Content", roles: ["admin", "content_editor"] },
  { href: "/admin/pricing", icon: DollarSign, label: "Pricing", roles: ["admin"] },
  { href: "/admin/referrals", icon: Gift, label: "Referrals", roles: ["admin"] },
  { href: "/admin/support", icon: LifeBuoy, label: "Support", roles: ["admin", "support_agent"] },
  { href: "/admin/flags", icon: ToggleLeft, label: "Feature Flags", roles: ["admin"] },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics", roles: ["admin"] },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-border p-4">
      <Logo className="mb-2" />
      <p className="mb-4 px-1 text-[11px] uppercase tracking-wide text-muted">Admin · {role}</p>
      <nav className="flex flex-col gap-0.5">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                active ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/dashboard" className="focus-ring mt-6 flex items-center gap-2 px-3 text-xs text-muted hover:text-foreground">
        <ArrowLeft size={13} /> Back to app
      </Link>
    </aside>
  );
}
