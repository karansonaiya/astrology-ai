import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat";
import { BfcacheGuard } from "@/components/layout/bfcache-guard";
import { NotificationPermissionPrompt } from "@/components/pwa/notification-permission-prompt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true, status: true },
  });

  // Found in a full audit: this only ever checked onboarding completion —
  // a user suspended/deleted AFTER their session was issued (JWT strategy,
  // no server-side revocation) kept seeing the full app here regardless,
  // same gap requireUser()/requireAdmin() had for every API route (now
  // fixed there too — see lib/auth/guard.ts). This can't fully invalidate
  // the JWT itself from a layout Server Component, but combined with that
  // API-level fix, a suspended/deleted user can no longer see real app
  // content OR have any API call succeed, even with a still-valid cookie.
  if (user?.status === "suspended" || user?.status === "deleted") redirect("/login");

  if (!user?.onboardingCompletedAt) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <PresenceHeartbeat />
      <BfcacheGuard />
      <AppSidebar />
      {/* min-w-0: without it, a flex child's content (e.g. kundli's wide
          planetary-positions table) can force this column — and the whole
          top-level flex row with it — wider than the viewport, causing the
          entire page to scroll sideways on mobile and clip text. Flex items
          default to min-width:auto, not 0; this is the standard fix. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <MaintenanceBanner />
        <NotificationPermissionPrompt />
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
