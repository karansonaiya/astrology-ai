import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise (integer) as a localized INR currency string. */
export function formatInr(paise: number, locale: string = "en-IN") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

/** Format a Date (UTC-stored) into a localized date string for display. */
export function formatDate(date: Date | string, locale: string = "en-IN") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: string = "en-IN") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Redact sensitive free-text before it ever reaches logs/observability. */
export function redactForLogs(input: string, maxLen = 80): string {
  if (!input) return input;
  const trimmed = input.length > maxLen ? `${input.slice(0, maxLen)}…` : input;
  return trimmed
    .replace(/\b\d{10,}\b/g, "[redacted-number]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[redacted-email]");
}

export function initialsFromName(name?: string | null) {
  if (!name) return "J";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
