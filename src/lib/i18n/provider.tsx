"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { allMessagesClient, type Messages } from "./messages-client";
import { type AppLocale, localeCookieName } from "./config";

type I18nContextValue = {
  locale: AppLocale;
  messages: Messages;
  setLocale: (locale: AppLocale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    // Persist to the user's profile if logged in — best-effort, non-blocking.
    fetch("/api/profile/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {});
  }, []);

  const messages = allMessagesClient[locale];

  const value = useMemo(() => ({ locale, messages, setLocale }), [locale, messages, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Translate a dot-path key, e.g. t("chat.title"). Supports {placeholder} interpolation. */
export function useT() {
  const { messages } = useI18n();
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = getByPath(messages, key);
      let str = typeof raw === "string" ? raw : key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [messages]
  );
}
