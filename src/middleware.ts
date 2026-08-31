import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Runs on the Node.js runtime (not Edge) so the auth() JWT callback can
// safely touch Prisma when needed, and so bcrypt-based flows never hit an
// Edge-incompatible API.
export const runtime = "nodejs";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/chat",
  "/profile",
  "/kundli",
  "/compatibility",
  "/career",
  "/relationship",
  "/reports",
  "/credits",
  "/payments",
  "/referral",
  "/settings",
  "/help",
  "/onboarding",
];

const ADMIN_PREFIX = "/admin";
const ADMIN_ROLES = new Set(["admin", "support_agent", "content_editor"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAdmin = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  if ((isProtected || isAdmin) && !session?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && session?.user?.id && !ADMIN_ROLES.has(session.user.role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
});

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  // 'unsafe-eval' is required in development only — Next.js/React use eval()
  // for Fast Refresh and dev-mode call-stack reconstruction. It's dropped in
  // production, where React never needs it.
  // Cloudflare Turnstile (CAPTCHA_PROVIDER="turnstile") needs its script
  // allowed and its challenge iframe allowed — see src/lib/captcha.ts and
  // src/components/ui/captcha-widget.tsx.
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://challenges.cloudflare.com"
      : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://challenges.cloudflare.com";

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.razorpay.com https://challenges.cloudflare.com",
      "frame-src 'self' https://api.razorpay.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ")
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)"],
};
