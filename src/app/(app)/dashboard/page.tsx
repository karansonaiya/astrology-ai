"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Sun, Sparkles, GitCompareArrows, Briefcase, Heart, FileText } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type CreditsSummary = { balance: number; freeQuestionsRemaining: number };
type BirthProfileSummary = { profile: unknown; completeness: number };
type ChatSummary = { chats: { id: string; title: string; updatedAt: string }[] };

export default function DashboardPage() {
  const t = useT();
  const { data: session } = useSession();

  const { data: credits } = useQuery({ queryKey: ["credits-summary"], queryFn: () => apiFetch<CreditsSummary>("/api/credits/summary") });
  const { data: profile } = useQuery({ queryKey: ["birth-profile-summary"], queryFn: () => apiFetch<BirthProfileSummary>("/api/birth-profile") });
  const { data: chats, isLoading: chatsLoading } = useQuery({ queryKey: ["chats"], queryFn: () => apiFetch<ChatSummary>("/api/chat") });

  const quickActions = [
    { href: "/chat", icon: MessageCircle, label: t("nav.chat") },
    { href: "/horoscope", icon: Sun, label: t("nav.dailyHoroscope") },
    { href: "/kundli", icon: Sparkles, label: t("nav.kundli") },
    { href: "/compatibility", icon: GitCompareArrows, label: t("nav.compatibility") },
    { href: "/career", icon: Briefcase, label: t("nav.career") },
    { href: "/relationship", icon: Heart, label: t("nav.relationship") },
    { href: "/reports", icon: FileText, label: t("nav.reports") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">
        {session?.user?.name ? t("dashboard.welcomeBack", { name: session.user.name }) : t("dashboard.welcomeGeneric")}
      </h1>
      {credits && (
        <p className="mt-1 text-sm text-muted">
          {t("dashboard.creditsRemaining", { count: credits.balance })} · {t("dashboard.freeQuestionsRemaining", { count: credits.freeQuestionsRemaining })}
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">{t("dashboard.quickActions")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {quickActions.map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="focus-ring h-full transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <a.icon size={22} className="text-gold" />
                <span className="text-sm font-medium">{a.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.profileCompleteness")}</CardTitle>
            <CardDescription>{t("dashboard.completeProfileCta")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={profile?.completeness ?? 0} />
            <p className="mt-2 text-xs text-muted">{profile?.completeness ?? 0}%</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/profile">{t("common.edit")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {chatsLoading ? (
              <Skeleton className="h-20" />
            ) : chats?.chats.length ? (
              chats.chats.slice(0, 4).map((c) => (
                <Link key={c.id} href={`/chat?id=${c.id}`} className="focus-ring rounded-lg px-2 py-1.5 text-sm hover:bg-surface-raised">
                  {c.title}
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">{t("chat.emptyStateTitle")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
