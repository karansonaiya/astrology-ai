"use client";

import { useT } from "@/lib/i18n/provider";

/**
 * A generic, hand-drawn-style reference diagram — NOT the customer's real
 * photo, and not claiming to be. Exists purely to answer "which line is
 * which" in plain visual terms, since the actual AI reading (grounded in
 * the customer's real uploaded photo) is text-only for a real reason: see
 * palm-reading.ts's header comment — vision models cannot reliably trace
 * the exact pixel path of a real hand's skin creases (verified live: asked
 * for real coordinates on a real photo twice, both times the drawn lines
 * landed nowhere near the actual hand). A generic illustration carries no
 * such accuracy risk because it was never claiming to match anyone's real
 * hand in the first place - it's a teaching diagram, like the ones in any
 * palmistry book.
 *
 * Only shows the lines this app's readings actually discuss (see
 * palm-reading.ts's PalmLine / generatePalmReportContent's PALM_TIER_STRUCTURE) -
 * Life, Heart, and Head lines always; Fate Line dashed, since it's the one
 * line the real reading only mentions when actually visible on the real
 * photo.
 */
export function PalmReferenceDiagram() {
  const t = useT();

  const lines = [
    { key: "lifeLine", color: "#d4a017", label: t("palmReading.lifeLineLabel") },
    { key: "heartLine", color: "#c0392b", label: t("palmReading.heartLineLabel") },
    { key: "headLine", color: "#2471a3", label: t("palmReading.headLineLabel") },
    { key: "fateLine", color: "#8e44ad", label: t("palmReading.fateLineLabel") },
  ];

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
      <svg width="130" height="170" viewBox="0 0 260 340" className="shrink-0" aria-hidden="true">
        <g fill="currentColor" className="text-muted/30">
          <rect x="90" y="300" width="80" height="40" rx="10" />
          <rect x="70" y="170" width="120" height="140" rx="35" />
          <rect x="85" y="60" width="26" height="120" rx="13" />
          <rect x="117" y="40" width="26" height="140" rx="13" />
          <rect x="149" y="55" width="26" height="125" rx="13" />
          <rect x="181" y="85" width="24" height="95" rx="12" />
          <rect x="20" y="185" width="55" height="90" rx="27" transform="rotate(-35 47 230)" />
        </g>
        <path d="M 95 185 C 78 215, 72 255, 92 298" fill="none" stroke="#d4a017" strokeWidth="5" strokeLinecap="round" />
        <path d="M 80 190 C 112 178, 150 178, 182 195" fill="none" stroke="#c0392b" strokeWidth="5" strokeLinecap="round" />
        <path d="M 78 215 C 116 220, 154 220, 180 230" fill="none" stroke="#2471a3" strokeWidth="5" strokeLinecap="round" />
        <path d="M 130 300 C 128 260, 126 220, 124 185" fill="none" stroke="#8e44ad" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 7" />
      </svg>
      <div className="flex flex-col gap-1.5">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
        <p className="mt-1 max-w-xs text-xs text-muted">{t("palmReading.referenceDiagramNote")}</p>
      </div>
    </div>
  );
}
