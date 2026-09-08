import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { AnonPresenceHeartbeat } from "@/components/layout/anon-presence-heartbeat";

// The AdSense loader script itself now lives in the root layout (app/layout.tsx),
// not here — AdSense's site-ownership verification needs its snippet in
// <head> on every page of the site, not just the public ones, and
// `beforeInteractive` (the strategy that guarantees real <head> placement)
// is only valid in the true root layout, per Next's own docs. Moving it
// doesn't change which pages show an actual ad, though — that's still only
// wherever <AdSlot /> is rendered (blog/faq/panchang/horoscope), since the
// loader script alone renders nothing on its own.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnonPresenceHeartbeat />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
