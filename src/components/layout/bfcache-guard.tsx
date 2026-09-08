"use client";

import { useEffect } from "react";

/**
 * Found live: "log out, then press the browser Back button" could still
 * show the old authenticated page (header with the account menu, Dashboard
 * links, everything) exactly as it looked before — because the browser's
 * back/forward cache (bfcache) restores a full snapshot of the page
 * entirely client-side, with NO request to the server at all. That means
 * the server-side session check in (app)/layout.tsx never runs again, so
 * it never gets a chance to redirect to /login.
 *
 * `pageshow`'s `event.persisted` is true exactly when a page was served
 * from bfcache rather than freshly rendered — forcing a real reload here
 * makes the browser re-request the page for real, which re-runs that
 * server-side check and correctly bounces to /login if the session is
 * gone. This is the deterministic fix (works regardless of Cache-Control
 * header nuances, which Next's dev server appears to override anyway —
 * confirmed live); proxy.ts's no-store header is kept alongside this as
 * defense in depth, not relied on alone.
 */
export function BfcacheGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
