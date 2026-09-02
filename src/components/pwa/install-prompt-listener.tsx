"use client";

import { useEffect } from "react";

// Captures the browser's `beforeinstallprompt` event and stashes it on
// `window.__prernaInstallPrompt` so any "Install App" button in the app
// (settings, onboarding) can trigger it later — the event can only be
// captured once and used once, so we hold a shared reference.
declare global {
  interface Window {
    __prernaInstallPrompt?: Event & { prompt: () => Promise<void> };
  }
}

export function InstallPromptListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      window.__prernaInstallPrompt = e as Window["__prernaInstallPrompt"];
      window.dispatchEvent(new CustomEvent("prerna-install-available"));
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
