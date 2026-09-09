import type { MetadataRoute } from "next";

// Next.js's file-convention robots — makes /robots.txt exist and serve real
// content, no static public/robots.txt needed. See sitemap.ts's header
// comment for the same "this didn't exist at all" context.
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://prernaai.netlify.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind a login (found by reading every route group's own
      // layout.tsx: (app) and (admin) both redirect to /login without a
      // session), plus the API surface itself (JSON, not indexable content)
      // and the login/onboarding pages, which have nothing worth ranking and
      // shouldn't be a crawl target either.
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/onboarding",
        "/login",
        "/settings",
        "/profile",
        "/credits",
        "/referral",
        "/help",
        "/career",
        "/relationship",
        "/compatibility",
        "/reports",
        "/payments",
        "/kundli",
        "/chat",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
