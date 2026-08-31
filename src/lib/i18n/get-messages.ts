import "server-only";
import en from "./messages/en.json";
import hi from "./messages/hi.json";
import gu from "./messages/gu.json";
import type { AppLocale } from "./config";

export const allMessages = { en, hi, gu } satisfies Record<AppLocale, unknown>;

export type Messages = typeof en;

export function getMessages(locale: AppLocale): Messages {
  return (allMessages[locale] ?? allMessages.en) as Messages;
}
