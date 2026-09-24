import type { Metadata } from "next";
import { BlogSignContent } from "./blog-sign-content";
import { AdSlot } from "@/components/ads/ad-slot";
import { ZODIAC_SIGNS, ZODIAC_LABELS, type ZodiacSign } from "@/lib/zodiac";
import { ZODIAC_PROFILES } from "@/lib/content/zodiac-profiles";

// Found in a full audit: every page in the app shared the exact same
// title/description from the root layout — for these 12 real per-sign
// pages specifically (the only ones the sitemap gives a non-trivial
// priority, 0.7, expecting Google to actually index each one separately),
// serving one generic title/description undermines that sitemap entry
// entirely. English only, matching sitemap.ts's own reasoning: locale is a
// cookie preference here, not a URL segment, so each URL gets exactly one
// canonical (crawler-facing) title, same as it gets one sitemap entry.
export async function generateMetadata({ params }: { params: Promise<{ sign: string }> }): Promise<Metadata> {
  const { sign } = await params;
  if (!(ZODIAC_SIGNS as readonly string[]).includes(sign)) return {};
  const zodiacSign = sign as ZodiacSign;
  const label = ZODIAC_LABELS[zodiacSign].en;
  const profile = ZODIAC_PROFILES[zodiacSign];
  const title = `${label} Zodiac Sign — Traits, Compatibility & Horoscope | Prerna AI`;
  const description = `${label} (${profile.dateRange}): ${profile.traits.en}`.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical: `/blog/${zodiacSign}` },
    openGraph: { title, description, url: `/blog/${zodiacSign}`, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default function BlogSignPage({ params }: { params: Promise<{ sign: string }> }) {
  return (
    <>
      <BlogSignContent params={params} />
      <AdSlot />
    </>
  );
}
