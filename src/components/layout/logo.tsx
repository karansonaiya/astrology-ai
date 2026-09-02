import Link from "next/link";

/**
 * Prerna AI mark: a two-tone sparkle (saffron/gold gradient primary sparkle
 * with a small warm-ivory companion sparkle) on a fixed dark badge —
 * "Prerna" means inspiration, and the twinkle/sparkle motif reads as both
 * "a spark of inspiration" and "a star" (astrology), which a single flame
 * (this app's previous "Jyoti"/light-branded mark) didn't. The badge color
 * is fixed (not theme-driven) so the logo reads consistently in both light
 * and dark UI modes, like most brand marks. Pure SVG, no external image
 * assets — mirrors scripts/generate-icons.mjs's mark exactly (keep both in
 * sync if this changes).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`focus-ring flex items-center gap-2 rounded-lg ${className ?? ""}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="logo-sparkle" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f6ce73" />
            <stop offset="55%" stopColor="#f0b429" />
            <stop offset="100%" stopColor="#e8600f" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="#241c15" />
        <path
          d="M16 4 L18.2 13.8 L27 16 L18.2 18.2 L16 28 L13.8 18.2 L5 16 L13.8 13.8 Z"
          fill="url(#logo-sparkle)"
        />
        <path
          d="M23 5 L23.8 8.2 L27 9 L23.8 9.8 L23 13 L22.2 9.8 L19 9 L22.2 8.2 Z"
          fill="#fbf3ea"
          opacity="0.92"
        />
      </svg>
      <span className="font-heading text-base font-semibold tracking-tight text-foreground">Prerna AI</span>
    </Link>
  );
}
