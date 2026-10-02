"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Wallet, Settings, Search } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./logout-button";
import { initialsFromName } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";

type CreditsSummary = { balance: number; freeQuestionsRemaining: number; freeQuestionsCap: number };

/**
 * A real quick-jump search over this app's own feature pages — not a
 * fabricated "search horoscopes/reports/astrologers" box (this app has no
 * such full-text search backend to wire up, and a decorative box that does
 * nothing would be worse than no box). Typing filters NAV_ITEMS by its
 * translated label; Enter or a click navigates straight there.
 */
function QuickNavSearch() {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches =
    query.trim().length > 0
      ? NAV_ITEMS.filter((item) => t(item.labelKey).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
      : [];

  const go = (href: string) => {
    router.push(href);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative hidden flex-1 max-w-sm lg:block">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) go(matches[0].href);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={t("common.quickNavPlaceholder")}
        className="focus-ring h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {matches.map((item) => (
            <button
              key={item.href}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(item.href)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-raised"
            >
              <item.icon size={15} className="text-muted" />
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const t = useT();
  const { data: session } = useSession();

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ["credits-summary"],
    queryFn: () => apiFetch<CreditsSummary>("/api/credits/summary"),
    enabled: !!session,
  });

  const isAdmin = ["admin", "support_agent", "content_editor"].includes(session?.user?.role ?? "");
  // Only admin/support_agent actually see the support/shop-inquiries/
  // puja-requests pages this counts — content_editor can't act on any of
  // them, so it never even fires this query for that role.
  const canSeePendingCount = ["admin", "support_agent"].includes(session?.user?.role ?? "");
  const { data: pending } = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: () => apiFetch<{ total: number }>("/api/admin/pending-count"),
    enabled: canSeePendingCount,
    // A real new inquiry/ticket should surface within a couple minutes of
    // it coming in, without the admin needing to refresh the page by hand.
    refetchInterval: 120_000,
  });
  const hasPending = !!pending && pending.total > 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2 text-sm text-muted md:hidden">
        <span className="font-heading font-semibold text-foreground">Prerna AI</span>
      </div>

      <QuickNavSearch />

      <div className="ml-auto flex items-center gap-2">
        {isAdmin && (
          <Button asChild size="sm" variant="outline" className="relative">
            <Link href="/admin">
              <ShieldCheck size={14} /> {t("nav.admin")}
              {hasPending && (
                <span
                  aria-label={t("admin.pendingItemsBadge")}
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-background"
                />
              )}
            </Link>
          </Button>
        )}
        <Badge variant="primary" className="hidden sm:inline-flex">
          <Wallet size={12} />
          {creditsLoading ? <Skeleton className="h-3 w-4" /> : credits ? credits.balance + credits.freeQuestionsRemaining : "…"}
        </Badge>
        <LanguageSwitcher className="hidden w-[100px] sm:flex" />
        <ThemeToggle />
        {/* The initials circle itself was previously just a static avatar
            with no interaction — kept the standalone icon LogoutButton next
            to it as-is (existing muscle memory / a still-useful one-click
            path), and added this dropdown ON the avatar as a second way to
            reach the same logout action plus the account email and a
            Settings shortcut, since neither was reachable from the header. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("common.account")}
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              {initialsFromName(session?.user?.name)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{session?.user?.email ?? session?.user?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings size={15} /> {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <LogoutButton variant="menu-item" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <LogoutButton />
      </div>
    </header>
  );
}
