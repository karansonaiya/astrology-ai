"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export type PushSupportState = "unsupported" | "unconfigured" | "denied" | "dev-only" | "ready";

// Same condition ServiceWorkerRegister itself gates on (see that file) — it
// only registers /sw.js in a production build, deliberately, to keep dev
// mode free of service-worker caching surprises while iterating. Found
// live: without checking this here too, clicking the toggle in `npm run
// dev` looked like it silently "did nothing" — it was actually awaiting
// navigator.serviceWorker.ready forever, since no service worker is ever
// going to register to satisfy that promise in dev. Short-circuiting to a
// clearly-labeled state instead of a silent hang is the fix.
const swWillRegister = process.env.NODE_ENV === "production";

// Any await on navigator.serviceWorker.ready is expected to resolve almost
// immediately once a service worker is active — this is a last-resort cap
// so an unexpected edge case (e.g. registration failed silently) fails
// loud/visibly after a few seconds instead of hanging the toggle forever.
function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out waiting for service worker")), ms)),
  ]);
}

/**
 * Drives the Settings page's "daily horoscope reminder" toggle against the
 * real browser Push API + /api/push/* — this used to be a plain useState
 * that toggled nothing real (found live: it didn't request permission,
 * subscribe, or persist anything anywhere). Deliberately a hook, not inline
 * in the settings page, so the same subscribe/unsubscribe logic could be
 * reused from an in-app "enable reminders" prompt elsewhere later without
 * duplicating it.
 */
export function usePushSubscription() {
  const [subscribed, setSubscribed] = useState(false);
  const [state, setState] = useState<PushSupportState>("unconfigured");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
      } else if (!swWillRegister) {
        if (!cancelled) setState("dev-only");
      } else if (!publicKey) {
        if (!cancelled) setState("unconfigured");
      } else if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
      } else {
        if (!cancelled) setState("ready");
        try {
          const reg = await withTimeout(navigator.serviceWorker.ready);
          const existing = await reg.pushManager.getSubscription();
          if (!cancelled) setSubscribed(!!existing);
        } catch {
          // Registration didn't actually happen this time for some other
          // reason — stays unsubscribed, which is the correct fallback.
        }
      }
      if (!cancelled) setLoading(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe(): Promise<boolean> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !swWillRegister) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : state);
      return false;
    }

    const reg = await withTimeout(navigator.serviceWorker.ready);
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // TS's lib.dom types for BufferSource have gotten stricter than what
      // PushManager.subscribe() actually accepts at runtime (a plain
      // Uint8Array has always worked here in every real browser) — cast
      // rather than fight the type, same as any other lib.dom/runtime gap.
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    await apiFetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) });
    setSubscribed(true);
    setState("ready");
    return true;
  }

  async function unsubscribe(): Promise<void> {
    if (!swWillRegister) return;
    const reg = await withTimeout(navigator.serviceWorker.ready);
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await apiFetch("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setSubscribed(false);
  }

  return { subscribed, state, loading, subscribe, unsubscribe };
}
