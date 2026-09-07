"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api-client";

const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Invisible — pings /api/presence once on mount and then every 60s, but
 * only while the tab is actually visible (document.visibilityState), so a
 * forgotten background tab doesn't count as "online". Mounted once in
 * src/app/(app)/layout.tsx, so it runs on every authenticated page.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      apiFetch("/api/presence", { method: "POST" }).catch(() => {
        // best-effort — a missed heartbeat just means this user drops out
        // of "online now" a bit early, never worth surfacing to the user
      });
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
