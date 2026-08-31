import Link from "next/link";

/**
 * Jyoti AI mark: a two-tone flame (saffron/gold gradient outer flame with a
 * warm ivory core) on a fixed dark badge — "Jyoti" means light/flame, so the
 * mark stays literal. The badge color is fixed (not theme-driven) so the
 * logo reads consistently in both light and dark UI modes, like most brand
 * marks. Pure SVG, no external image assets.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`focus-ring flex items-center gap-2 rounded-lg ${className ?? ""}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="logo-flame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f6ce73" />
            <stop offset="55%" stopColor="#f0b429" />
            <stop offset="100%" stopColor="#e8600f" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="#241c15" />
        <path
          d="M16 4.5 C13.5 7.5 12.3 9.5 13.3 11.5 C14.1 13 15.6 13.4 16.7 12.6 C15.7 10.6 16.4 8.3 18.5 6.5 C20.9 10 24.6 15.5 24.6 19.8 C24.6 25 20.9 28.5 16 28.5 C11.1 28.5 7.4 25 7.4 19.8 C7.4 15.3 10.8 11 16 4.5 Z"
          fill="url(#logo-flame)"
        />
        <path
          d="M16 15.5 C14.6 17.4 13.9 18.9 14.6 20.2 C15.1 21.1 16 21.3 16.7 20.7 C16.1 19.5 16.5 18.2 17.7 17.1 C19.3 19 21.2 22.1 21.2 24.3 C21.2 27.3 19.1 29.3 16 29.3 C12.9 29.3 10.8 27.3 10.8 24.3 C10.8 21.6 12.9 19 16 15.5 Z"
          fill="#fbf3ea"
          opacity="0.92"
        />
      </svg>
      <span className="font-heading text-base font-semibold tracking-tight text-foreground">Jyoti AI</span>
    </Link>
  );
}
