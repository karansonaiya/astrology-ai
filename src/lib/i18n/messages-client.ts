// Client-safe mirror of get-messages.ts (no `server-only` import), used by
// the I18nProvider to switch languages instantly without a round trip.
import en from "./messages/en.json";
import hi from "./messages/hi.json";
import gu from "./messages/gu.json";
import type { AppLocale } from "./config";

export const allMessagesClient = { en, hi, gu } satisfies Record<AppLocale, unknown>;
export type Messages = typeof en;
