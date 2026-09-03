"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Wallet, Settings } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./logout-button";
import { initialsFromName } from "@/lib/utils";

type CreditsSummary = { balance: number; freeQuestionsRemaining: number; freeQuestionsCap: number };

export function AppHeader() {
  const t = useT();
  const { data: session } = useSession();

  const { data: credits } = useQuery({
    queryKey: ["credits-summary"],
    queryFn: () => apiFetch<CreditsSummary>("/api/credits/summary"),
    enabled: !!session,
  });

  const isAdmin = ["admin", "support_agent", "content_editor"].includes(session?.user?.role ?? "");

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2 text-sm text-muted md:hidden">
        <span className="font-heading font-semibold text-foreground">Prerna AI</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isAdmin && (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin"><ShieldCheck size={14} /> {t("nav.admin")}</Link>
          </Button>
        )}
        <Badge variant="primary" className="hidden sm:inline-flex">
          <Wallet size={12} />
          {credits ? credits.balance + credits.freeQuestionsRemaining : "…"}
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
