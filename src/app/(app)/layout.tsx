import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat";
import { BfcacheGuard } from "@/components/layout/bfcache-guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true },
  });

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
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
