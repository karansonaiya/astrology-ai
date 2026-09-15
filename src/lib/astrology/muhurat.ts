import type { PanchangResult, ChoghadiyaSlot } from "./panchang";

/**
 * Muhurat (auspicious-time) verdict, built ENTIRELY from real Prokerala
 * panchang/choghadiya/auspicious-period/inauspicious-period data (see
 * panchang.ts) — not invented, not AI-guessed. Two real signals do all the
 * classification work:
 *
 * 1. Each Choghadiya slot's own `type` field, already returned by Prokerala
 *    as e.g. "Most Auspicious" / "Auspicious" / "Neutral" / "Inauspicious" /
 *    "Most Inauspicious" — a real, per-date, per-location classification,
 *    not something we compute ourselves.
 * 2. `panchang.inauspicious` — real named periods (Rahu Kaal, Yamaganda,
 *    Gulika, etc.), universally avoided for any auspicious activity in
 *    classical tradition, regardless of event type.
 *
 * The only static/traditional knowledge layered on top (same "fixed,
 * classical lookup, not invented" status as gemstones.ts's RASHI_LORD/
 * PLANET_GEMSTONE tables) is which of the 8 traditional Choghadiya names is
 * *especially* recommended for a given purpose: "Char" (meaning "moving")
 * for travel, "Labh" (meaning "gain") for starting a business — this only
 * ADDS a highlight on top of the real auspicious/inauspicious classification
 * above, it never overrides it.
 */

export type MuhuratEventType = "general" | "travel" | "business_start";

export type MuhuratWindow = {
  name: string;
  type: string;
  start: string;
  end: string;
  /** True if this Choghadiya's traditional name is especially recommended for the chosen event type. */
  isSpecialForEvent: boolean;
};

export type MuhuratVerdict = {
  eventType: MuhuratEventType;
  date: string;
  vaara: string | null;
  /** Real Choghadiya slots whose own `type` field marks them auspicious. */
  favorableWindows: MuhuratWindow[];
  /** Real Choghadiya slots marked inauspicious, plus real named inauspicious periods (Rahu Kaal etc.) — always avoid, for any event type. */
  avoidWindows: MuhuratWindow[];
  /** The real Abhijit Muhurat window for this day, if Prokerala returned one. */
  abhijitWindow: { start: string; end: string } | null;
};

// Which traditional Choghadiya names are especially recommended for which
// purpose — classical, fixed knowledge (see header comment). "general"
// intentionally has no special name: any real favorable window already
// found above already serves a general auspicious start.
const CHOGHADIYA_EVENT_SPECIAL: Record<MuhuratEventType, string[]> = {
  general: [],
  travel: ["char"],
  business_start: ["labh"],
};

function isInauspiciousType(type: string): boolean {
  return type.toLowerCase().includes("inauspicious");
}

// "auspicious" is a substring of "inauspicious" — inauspicious must be
// excluded explicitly, not just matched-out by a positive check.
function isAuspiciousType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("auspicious") && !t.includes("inauspicious");
}

function toWindow(slot: ChoghadiyaSlot, isSpecialForEvent: boolean): MuhuratWindow {
  return { name: slot.name, type: slot.type, start: slot.start, end: slot.end, isSpecialForEvent };
}

export function getRealMuhuratVerdict(panchang: PanchangResult, eventType: MuhuratEventType, date: string): MuhuratVerdict {
  const allChoghadiya = [...panchang.choghadiyaDay, ...panchang.choghadiyaNight];
  const specialNames = CHOGHADIYA_EVENT_SPECIAL[eventType];

  const favorableWindows = allChoghadiya
    .filter((s) => isAuspiciousType(s.type))
    .map((s) => toWindow(s, specialNames.some((n) => s.name.toLowerCase().includes(n))))
    // Especially-recommended windows first, so the UI/AI naturally leads with them.
    .sort((a, b) => Number(b.isSpecialForEvent) - Number(a.isSpecialForEvent));

  const avoidFromChoghadiya = allChoghadiya.filter((s) => isInauspiciousType(s.type)).map((s) => toWindow(s, false));

  const avoidFromNamedPeriods: MuhuratWindow[] = panchang.inauspicious.flatMap((p) =>
    p.windows.map((w) => ({ name: p.name, type: p.type || "Inauspicious", start: w.start, end: w.end, isSpecialForEvent: false }))
  );

  const abhijit = panchang.auspicious.find((p) => p.name.toLowerCase().includes("abhijit"));
  const abhijitWindow = abhijit?.windows[0] ? { start: abhijit.windows[0].start, end: abhijit.windows[0].end } : null;

  return {
    eventType,
    date,
    vaara: panchang.vaara,
    favorableWindows,
    avoidWindows: [...avoidFromNamedPeriods, ...avoidFromChoghadiya],
    abhijitWindow,
  };
}
