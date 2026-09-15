"use client";

import { useState } from "react";
import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ZODIAC_LABELS, type ZodiacSign } from "@/lib/zodiac";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * A real, data-driven Vedic birth chart — North Indian (diamond) and South
 * Indian (square) styles, matching the standard traditional layouts (the
 * kind found in any physical kundli printout), toggleable like most real
 * astrology sites/apps. Every position on this chart is real: it's driven
 * entirely by calc.houses/calc.planetaryPositions/calc.ascendant, which are
 * already computed server-side from the real Prokerala ephemeris data (see
 * astrology/adapter.ts) — nothing here invents a placement.
 *
 * Planet labels use their traditional Sanskrit short names (Surya, Chandra,
 * Mangal, Budha, Guru, Shukra, Shani, Rahu, Ketu) regardless of the app's
 * current locale — a deliberate, common convention in Vedic astrology charts
 * (the same way scientific charts keep Latin names) rather than switching to
 * plain English/Hindi/Gujarati mid-chart; the rest of the page's UI chrome
 * still follows the app's normal i18n.
 */
const SANSKRIT_PLANET: Record<string, string> = {
  Sun: "Surya",
  Moon: "Chandra",
  Mars: "Mangal",
  Mercury: "Budha",
  Jupiter: "Guru",
  Venus: "Shukra",
  Saturn: "Shani",
  Rahu: "Rahu",
  Ketu: "Ketu",
};

type PlanetPos = { planet: string; sign: ZodiacSign; house: number | null; retrograde: boolean };
export type ChartData = {
  ascendant: ZodiacSign | null;
  moonSign: ZodiacSign | null;
  nakshatra: string | null;
  planetaryPositions: PlanetPos[] | null;
  houses: { house: number; sign: ZodiacSign }[] | null;
};

function signNumber(sign: ZodiacSign): number {
  return ZODIAC_SIGNS.indexOf(sign) + 1;
}

function planetLabel(p: PlanetPos): string {
  return (SANSKRIT_PLANET[p.planet] ?? p.planet) + (p.retrograde ? " (R)" : "");
}

// The 4 "kite" houses (kendra positions 1/4/7/10 in the fixed North Indian
// layout) get bigger text — matches how real North Indian charts visually
// emphasize these; the 8 corner triangles are naturally smaller shapes so
// get smaller text to actually fit.
const NORTH_LAYOUT: { house: number; labelX: number; labelY: number; big: boolean }[] = [
  { house: 1, labelX: 200, labelY: 70, big: true },
  { house: 2, labelX: 110, labelY: 48, big: false },
  { house: 3, labelX: 52, labelY: 108, big: false },
  { house: 4, labelX: 108, labelY: 200, big: true },
  { house: 5, labelX: 52, labelY: 292, big: false },
  { house: 6, labelX: 110, labelY: 352, big: false },
  { house: 7, labelX: 200, labelY: 330, big: true },
  { house: 8, labelX: 290, labelY: 352, big: false },
  { house: 9, labelX: 348, labelY: 292, big: false },
  { house: 10, labelX: 292, labelY: 200, big: true },
  { house: 11, labelX: 348, labelY: 108, big: false },
  { house: 12, labelX: 290, labelY: 48, big: false },
];

function NorthIndianChart({ chart }: { chart: ChartData }) {
  const houseSign = new Map<number, ZodiacSign>();
  if (chart.houses) {
    for (const h of chart.houses) houseSign.set(h.house, h.sign);
  } else if (chart.ascendant) {
    const ascIdx = ZODIAC_SIGNS.indexOf(chart.ascendant);
    for (let h = 1; h <= 12; h++) houseSign.set(h, ZODIAC_SIGNS[(ascIdx + h - 1) % 12]);
  }

  const planetsByHouse = new Map<number, PlanetPos[]>();
  for (const p of chart.planetaryPositions ?? []) {
    if (p.house == null) continue;
    const list = planetsByHouse.get(p.house) ?? [];
    list.push(p);
    planetsByHouse.set(p.house, list);
  }

  return (
    <svg viewBox="0 0 400 400" className="h-auto w-full text-foreground" role="img" aria-label="North Indian birth chart">
      {/* The classic construction: outer square + both diagonals + the
          diamond connecting each side's midpoint — this single set of
          lines, drawn once, is exactly the 12-house grid (no per-house
          polygon strokes needed, which would double-draw shared edges). */}
      <rect x="20" y="20" width="360" height="360" fill="none" stroke="var(--color-gold)" strokeWidth="2" />
      <line x1="20" y1="20" x2="380" y2="380" stroke="var(--color-gold)" strokeWidth="1.25" />
      <line x1="380" y1="20" x2="20" y2="380" stroke="var(--color-gold)" strokeWidth="1.25" />
      <polygon points="200,20 380,200 200,380 20,200" fill="none" stroke="var(--color-gold)" strokeWidth="1.25" />

      {NORTH_LAYOUT.map((cell) => {
        const sign = houseSign.get(cell.house);
        const planets = planetsByHouse.get(cell.house) ?? [];
        const numberSize = cell.big ? 20 : 13;
        const planetSize = cell.big ? 10.5 : 8.5;
        return (
          <g key={cell.house}>
            {sign && (
              <text
                x={cell.labelX}
                y={cell.labelY}
                textAnchor="middle"
                fontSize={numberSize}
                fontWeight="700"
                fill="var(--color-gold)"
              >
                {signNumber(sign)}
              </text>
            )}
            {planets.map((p, i) => (
              <text
                key={p.planet}
                x={cell.labelX}
                y={cell.labelY + 15 + i * (planetSize + 3)}
                textAnchor="middle"
                fontSize={planetSize}
                fill="currentColor"
              >
                {planetLabel(p)}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Fixed sign->cell positions in the standard South Indian layout — signs
// never move (unlike North Indian, where houses are fixed and signs
// rotate); the center 2x2 block is conventionally left empty.
const SOUTH_GRID: { sign: ZodiacSign; row: number; col: number }[] = [
  { sign: "pisces", row: 0, col: 0 },
  { sign: "aries", row: 0, col: 1 },
  { sign: "taurus", row: 0, col: 2 },
  { sign: "gemini", row: 0, col: 3 },
  { sign: "aquarius", row: 1, col: 0 },
  { sign: "cancer", row: 1, col: 3 },
  { sign: "capricorn", row: 2, col: 0 },
  { sign: "leo", row: 2, col: 3 },
  { sign: "sagittarius", row: 3, col: 0 },
  { sign: "scorpio", row: 3, col: 1 },
  { sign: "libra", row: 3, col: 2 },
  { sign: "virgo", row: 3, col: 3 },
];

function SouthIndianChart({ chart, locale }: { chart: ChartData; locale: AppLocale }) {
  const planetsBySign = new Map<ZodiacSign, PlanetPos[]>();
  for (const p of chart.planetaryPositions ?? []) {
    const list = planetsBySign.get(p.sign) ?? [];
    list.push(p);
    planetsBySign.set(p.sign, list);
  }

  return (
    <svg viewBox="0 0 400 400" className="h-auto w-full text-foreground" role="img" aria-label="South Indian birth chart">
      <rect x="20" y="20" width="360" height="360" fill="none" stroke="var(--color-gold)" strokeWidth="2" />
      <rect x="110" y="110" width="180" height="180" fill="none" stroke="var(--color-border)" strokeWidth="1" />
      {SOUTH_GRID.map(({ sign, row, col }) => {
        const x = 20 + col * 90;
        const y = 20 + row * 90;
        const isAscendant = chart.ascendant === sign;
        const planets = planetsBySign.get(sign) ?? [];
        return (
          <g key={sign}>
            <rect
              x={x}
              y={y}
              width="90"
              height="90"
              fill="none"
              stroke={isAscendant ? "var(--color-primary)" : "var(--color-gold)"}
              strokeWidth={isAscendant ? 2.5 : 1.25}
            />
            <text x={x + 8} y={y + 16} fontSize="9.5" fill="var(--color-muted)">
              {ZODIAC_SYMBOLS[sign]} {ZODIAC_LABELS[sign][locale]}
            </text>
            {isAscendant && (
              <text x={x + 82} y={y + 16} fontSize="9" textAnchor="end" fill="var(--color-primary)" fontWeight="700">
                Asc
              </text>
            )}
            {planets.map((p, i) => (
              <text key={p.planet} x={x + 45} y={y + 44 + i * 14} textAnchor="middle" fontSize="10" fill="currentColor">
                {planetLabel(p)}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function KundliChart({ chart, locale }: { chart: ChartData; locale: AppLocale }) {
  const hasHouseData = !!chart.ascendant;
  const [style, setStyle] = useState<"north" | "south">("north");
  // North Indian is anchored on the ascendant (fixed house-1 position) — if
  // birth time (and so the ascendant) isn't known, that chart can't be
  // drawn meaningfully; South Indian still works since sign positions are
  // fixed regardless of ascendant, so fall back to it automatically.
  const effectiveStyle = hasHouseData ? style : "south";

  return (
    <div>
      {hasHouseData && (
        <div className="mb-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setStyle("north")}
            className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              effectiveStyle === "north" ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground"
            }`}
          >
            North Indian (Diamond)
          </button>
          <button
            type="button"
            onClick={() => setStyle("south")}
            className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              effectiveStyle === "south" ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground"
            }`}
          >
            South Indian (Square)
          </button>
        </div>
      )}

      <div className="mx-auto max-w-sm">
        {effectiveStyle === "north" ? <NorthIndianChart chart={chart} /> : <SouthIndianChart chart={chart} locale={locale} />}
      </div>

      <p className="mt-3 text-center text-xs text-gold">
        {chart.ascendant && (
          <>
            <span className="font-semibold">Lagna:</span> {ZODIAC_LABELS[chart.ascendant][locale]}
            {" • "}
          </>
        )}
        {chart.moonSign && (
          <>
            <span className="font-semibold">Chandra:</span> {ZODIAC_LABELS[chart.moonSign][locale]}
            {" • "}
          </>
        )}
        {chart.nakshatra && (
          <>
            <span className="font-semibold">Nakshatra:</span> {chart.nakshatra}
          </>
        )}
      </p>
      {!hasHouseData && (
        <p className="mt-1 text-center text-xs text-muted">North Indian house chart needs a known birth time — showing signs only for now.</p>
      )}
    </div>
  );
}
