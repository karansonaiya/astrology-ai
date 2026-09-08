"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api-client";

const HEARTBEAT_INTERVAL_MS = 60_000;
const STORAGE_KEY = "prerna_visitor_id";

function getOrCreateVisitorId(): string | null {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null; // private browsing / storage blocked — just skip counting this visitor
  }
}

/**
 * Public-pages counterpart to presence-heartbeat.tsx (which only runs for
 * logged-in users under (app)'s layout). Mounted in the (marketing) layout
 * so an anonymous visitor browsing the homepage/panchang/blog/faq counts
 * toward the admin's "site visitors now" too. Uses a random per-browser id
 * (localStorage) purely as a de-dupe key — never anything identifying, and
 * never sent anywhere the logged-in heartbeat's real user id is.
 */
export function AnonPresenceHeartbeat() {
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      apiFetch("/api/presence/anon", { method: "POST", body: JSON.stringify({ visitorId }) }).catch(() => {
        // best-effort — a missed heartbeat just drops this visitor out of the count a bit early
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
