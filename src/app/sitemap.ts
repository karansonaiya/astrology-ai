import type { MetadataRoute } from "next";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

// Next.js's file-convention sitemap — this alone makes /sitemap.xml exist and
// serve real XML, no hand-written XML template needed. Found live: neither
// this file nor a static one existed at all, meaning none of this app's real
// public content (Horoscope, Panchang, Blog) had ever told Google it should
// be indexed — for a content site like this, organic search is normally the
// single biggest free growth channel, and it was entirely unaddressed.
//
// Locale is a pure cookie/Accept-Language preference in this app, not a URL
// segment (confirmed: no /en/, /hi/, /gu/ prefix anywhere) — so each real
// page needs exactly one sitemap entry, not one per locale.
//
// Falls back to the known production domain if NEXT_PUBLIC_APP_URL isn't set
// in this deployment's environment — .env's own value is "http://localhost:3000"
// (a local-dev placeholder), so this only produces correct absolute URLs in
// production once NEXT_PUBLIC_APP_URL is actually set to the real domain
// there too (same as NEXT_PUBLIC_ADSENSE_CLIENT_ID/SLOT_ID needed to be).
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://prernaai.netlify.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/horoscope", changeFrequency: "daily", priority: 0.9 },
    { path: "/panchang", changeFrequency: "daily", priority: 0.9 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.6 },
    { path: "/features", changeFrequency: "monthly", priority: 0.6 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
    { path: "/safety", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = staticPages.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // /blog/[sign] — one real per-sign page per ZODIAC_SIGNS (see blog/[sign]/
  // blog-sign-content.tsx), not enumerated anywhere else for tooling before this.
  for (const sign of ZODIAC_SIGNS) {
    entries.push({
      url: `${BASE_URL}/blog/${sign}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
