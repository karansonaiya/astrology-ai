"use client";

import { useEffect } from "react";

/**
 * The actual AdSense placement — a plain <ins> tag AdSense's own script
 * (loaded once site-wide, see AdSenseScript in the marketing layout)
 * fills in after the `adsbygoogle.push({})` call below. Rendering this at
 * all is already gated server-side by AdSlot (config present? not a
 * subscriber?) — this component's only job is the actual embed.
 */
export function AdUnit({ clientId, slotId }: { clientId: string; slotId: string }) {
  useEffect(() => {
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle ?? []).push({});
    } catch {
      // best-effort — an ad blocker or slow/failed script load should never
      // throw into the rest of the page
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
