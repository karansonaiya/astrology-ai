"use client";

import { useT } from "@/lib/i18n/provider";

/**
 * A generic, hand-drawn-style reference diagram — NOT the customer's real
 * photo, and not claiming to be. Exists purely to answer "which feature is
 * which" in plain visual terms, since the actual AI reading (grounded in
 * the customer's real uploaded photo) is text-only — same reasoning as
 * palm-reference-diagram.tsx: a generic illustration carries no accuracy
 * risk because it never claims to match anyone's real face.
 *
 * Only shows the five features the free reading always discusses (see
 * face-reading.ts's FaceFeature) — Forehead, Eyes, Nose, Lips, Chin.
 */
export function FaceReferenceDiagram() {
  const t = useT();

  const features = [
    { key: "foreheadLabel", color: "#d4a017", label: t("faceReading.foreheadLabel") },
    { key: "eyesLabel", color: "#2471a3", label: t("faceReading.eyesLabel") },
    { key: "noseLabel", color: "#8e44ad", label: t("faceReading.noseLabel") },
    { key: "lipsLabel", color: "#c0392b", label: t("faceReading.lipsLabel") },
    { key: "chinLabel", color: "#16a085", label: t("faceReading.chinLabel") },
  ];

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
      <svg width="130" height="170" viewBox="0 0 260 340" className="shrink-0" aria-hidden="true">
        <g fill="currentColor" className="text-muted/30">
          <ellipse cx="130" cy="170" rx="95" ry="130" />
        </g>
        {/* Forehead */}
        <rect x="60" y="55" width="140" height="12" rx="6" fill="#d4a017" />
        {/* Eyes */}
        <circle cx="90" cy="140" r="10" fill="none" stroke="#2471a3" strokeWidth="5" />
        <circle cx="170" cy="140" r="10" fill="none" stroke="#2471a3" strokeWidth="5" />
        {/* Nose */}
        <path d="M 130 150 L 118 210 Q 130 220 142 210 Z" fill="none" stroke="#8e44ad" strokeWidth="5" strokeLinejoin="round" />
        {/* Lips */}
        <path d="M 105 240 Q 130 252 155 240" fill="none" stroke="#c0392b" strokeWidth="6" strokeLinecap="round" />
        {/* Chin */}
        <path d="M 100 260 Q 130 300 160 260" fill="none" stroke="#16a085" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col gap-1.5">
        {features.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />
            <span>{f.label}</span>
          </div>
        ))}
        <p className="mt-1 max-w-xs text-xs text-muted">{t("faceReading.referenceDiagramNote")}</p>
      </div>
    </div>
  );
}
