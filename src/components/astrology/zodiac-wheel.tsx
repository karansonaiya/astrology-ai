import { ZODIAC_SIGNS, ZODIAC_SYMBOLS, ZODIAC_LABELS } from "@/lib/zodiac";
import type { AppLocale } from "@/lib/i18n/config";

/** Original, accessible SVG zodiac wheel — no external image assets. */
export function ZodiacWheel({ locale, label }: { locale: AppLocale; label: string }) {
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 24;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={center} cy={center} r={radius + 18} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      <circle cx={center} cy={center} r={radius - 10} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      {ZODIAC_SIGNS.map((sign, i) => {
        const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        return (
          <g key={sign}>
            <line
              x1={center + Math.cos(angle) * (radius - 10)}
              y1={center + Math.sin(angle) * (radius - 10)}
              x2={center + Math.cos(angle) * (radius + 18)}
              y2={center + Math.sin(angle) * (radius + 18)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="var(--color-gold)">
              {ZODIAC_SYMBOLS[sign]}
            </text>
            <title>{ZODIAC_LABELS[sign][locale]}</title>
          </g>
        );
      })}
      <circle cx={center} cy={center} r={6} fill="var(--color-primary)" />
    </svg>
  );
}
