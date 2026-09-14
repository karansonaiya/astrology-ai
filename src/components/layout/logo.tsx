import Link from "next/link";
import Image from "next/image";

/**
 * Prerna AI mark: a moon/face/zodiac-wheel emblem (replaced the previous
 * plain two-tone sparkle mark — founder's choice after comparing both
 * against a couple of AI-generated concepts). Raster, not inline SVG this
 * time (the artwork itself is an illustration, not something reasonably
 * redrawn as clean vector paths) — scripts/generate-icons.mjs derives
 * every icon size (favicon, PWA icons, apple-touch-icon) from the same
 * master source (scripts/assets/logo-mark-source.png) so this header mark
 * and every icon stay visually identical; keep both pointed at that one
 * source if the mark changes again.
 *
 * Found live: this emblem's fine detail (the zodiac-wheel ring, individual
 * hair strands) reads clearly at 192px+ but gets genuinely muddy at a
 * favicon's 16-32px — a real tradeoff, accepted deliberately here in favor
 * of one consistent mark everywhere rather than juggling two different
 * marks for "large" vs. "tiny" contexts.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`focus-ring flex items-center gap-2 rounded-lg ${className ?? ""}`}>
      <Image src="/icons/icon-512.png" alt="" width={32} height={32} className="h-8 w-8" priority />
      <span className="font-heading text-base font-semibold tracking-tight text-foreground">Prerna AI</span>
    </Link>
  );
}
