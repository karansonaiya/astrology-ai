"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void; theme?: string }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Renders a Cloudflare Turnstile widget when CAPTCHA_PROVIDER="turnstile" is
 * configured (NEXT_PUBLIC_CAPTCHA_SITE_KEY set) — renders nothing otherwise,
 * so this is safe to drop into any public form unconditionally. Calls
 * `onVerify(token)` once solved; pass that token to the server, which
 * checks it via verifyCaptcha() (src/lib/captcha.ts).
 */
export function CaptchaWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
  const enabled = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER === "turnstile" && !!siteKey;
  const elementId = `turnstile-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const rendered = useRef(false);

  useEffect(() => {
    if (!enabled || rendered.current) return;
    rendered.current = true;
    loadTurnstileScript()
      .then(() => {
        window.turnstile?.render(`#${elementId}`, {
          sitekey: siteKey!,
          callback: onVerify,
          "expired-callback": () => onVerify(""),
        });
      })
      .catch((err) => console.error("[captcha] widget failed to load:", err));
    // onVerify intentionally omitted from deps — Turnstile's render() call
    // captures it once; re-rendering the widget on every parent re-render
    // (a new inline callback) would reset the user's in-progress challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, elementId, siteKey]);

  if (!enabled) return null;
  return <div id={elementId} className="my-1" />;
}
