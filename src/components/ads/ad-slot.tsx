import { auth } from "@/auth";
import { isActiveSubscriber } from "@/lib/payments/subscription-status";
import { AdUnit } from "./ad-unit";

/**
 * Drop this on a public marketing page (blog/faq/panchang/daily-horoscope
 * only — never on /dashboard, /chat, /kundli, or anywhere else behind
 * login) wherever a single ad placement won't crowd out real content.
 *
 * Deliberately a server component, not client-side: the decision to show
 * an ad at all is made once, server-side, before anything ships to the
 * browser —
 *   1. No NEXT_PUBLIC_ADSENSE_CLIENT_ID/SLOT_ID configured → render nothing.
 *      Ads are entirely opt-in; nothing breaks or shows a placeholder box
 *      until a real AdSense account is wired up.
 *   2. Signed in AND currently inside a paid Monthly Premium period → render
 *      nothing (see the pricing page's "no ads" line — this is what makes
 *      that true, not just marketing copy).
 *   3. Otherwise → the real ad.
 * An anonymous (not signed in) visitor always falls through to case 3 —
 * there's no session to check a subscription against, same as everywhere
 * else in the app that only personalizes for logged-in users.
 */
export async function AdSlot() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  if (!clientId || !slotId) return null;

  const session = await auth();
  if (session?.user?.id) {
    const subscriber = await isActiveSubscriber(session.user.id);
    if (subscriber) return null;
  }

  return (
    <div className="my-6 flex justify-center">
      <AdUnit clientId={clientId} slotId={slotId} />
    </div>
  );
}
