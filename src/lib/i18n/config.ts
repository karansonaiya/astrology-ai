export const locales = ["en", "hi", "gu"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
};

export const localeCookieName = "prerna_locale";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Best-effort mapping from a browser Accept-Language / navigator.language value. */
export function resolveLocaleFromBrowser(input: string | undefined | null): AppLocale {
  if (!input) return defaultLocale;
  const lower = input.toLowerCase();
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("gu")) return "gu";
  return defaultLocale;
}
