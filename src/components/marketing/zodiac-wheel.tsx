import { ZODIAC_SIGNS, type ZodiacSign } from "@/lib/zodiac";

// Found live: the Unicode zodiac glyphs (♈♉♊…) rendered as empty tofu boxes
// in this app's actual font stack (Inter + Noto Gujarati/Devanagari has no
// coverage for the astrological-symbols block, and SVG <text> doesn't fall
// back to a system symbol font the way HTML text sometimes does). Plain
// 3-letter abbreviations render correctly in any font, no exceptions.
const ZODIAC_ABBR: Record<ZodiacSign, string> = {
  aries: "Ari", taurus: "Tau", gemini: "Gem", cancer: "Can", leo: "Leo", virgo: "Vir",
  libra: "Lib", scorpio: "Sco", sagittarius: "Sag", capricorn: "Cap", aquarius: "Aqu", pisces: "Pis",
};

/**
 * Decorative marketing graphic — a real zodiac wheel, not a stock/
 * AI-generated "guru" photo. Deliberate choice: this app has no real human
 * astrologers to photograph, and generating a fake photorealistic person
 * would misrepresent the product the same way a fabricated testimonial
 * would. Pure inline SVG, themes correctly via currentColor/CSS vars, no
 * image asset.
 */
export function ZodiacWheel({ size = 320, className }: { size?: number; className?: string }) {
  const center = size / 2;
  const symbolRadius = size * 0.4;
  const ringRadius = size * 0.48;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <circle cx={center} cy={center} r={ringRadius} fill="none" stroke="var(--color-border)" strokeWidth={1.5} />
      <circle cx={center} cy={center} r={size * 0.28} fill="none" stroke="var(--color-gold)" strokeOpacity={0.35} strokeWidth={1} />
      <circle cx={center} cy={center} r={size * 0.16} fill="var(--color-tan)" fillOpacity={0.5} />
      {ZODIAC_SIGNS.map((sign, i) => {
        const angle = (i / ZODIAC_SIGNS.length) * Math.PI * 2 - Math.PI / 2;
        // Rounded to 2dp — an unrounded transcendental-function result can
        // differ in its last float bit between the server render and the
        // client hydration pass (same math, different JS engine build),
        // which React then flags as a real hydration mismatch. Found live
        // via a real browser console check. Irrelevant to visual fidelity
        // at this size; fixes the mismatch outright.
        const x = Math.round((center + Math.cos(angle) * symbolRadius) * 100) / 100;
        const y = Math.round((center + Math.sin(angle) * symbolRadius) * 100) / 100;
        return (
          <text
            key={sign}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.04}
            fontWeight={600}
            fill="var(--color-gold)"
          >
            {ZODIAC_ABBR[sign]}
          </text>
        );
      })}
    </svg>
  );
}
