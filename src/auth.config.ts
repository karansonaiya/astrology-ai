import type { NextAuthConfig } from "next-auth";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * The Prisma-free half of the NextAuth config — deliberately split out of
 * auth.ts so middleware.ts can import ONLY this file. Without this split,
 * middleware's dependency graph pulls in auth.ts's PrismaAdapter + prisma
 * client, and Next.js bundles that whole chain (including Prisma's native
 * query-engine binary) into the middleware bundle.
 *
 * That's harmless on Vercel (its Node.js-runtime middleware supports native
 * addons), but broke the Netlify build outright: "Usage of unsupported C++
 * Addon(s) found in Node.js Middleware ... .prisma/client/libquery_engine-*.so.node"
 * (Netlify's middleware bundler can't ship native binaries). Reproduced live
 * on a Netlify deploy 2026-09-02.
 *
 * `providers: []` here is intentional and safe: middleware only ever reads
 * an *existing* session (via the `session` callback below, which just maps
 * already-decoded JWT claims — no DB lookup) — it never calls signIn() or
 * runs a provider's authorize(), so there's nothing here that needs the
 * real providers/adapter. auth.ts spreads this config and adds the real
 * providers + PrismaAdapter + the DB-touching jwt() callback on top, for
 * every other server context (API routes, server components), where
 * Node.js + native addons are always fine.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  // Found live: logout appeared to do nothing on the deployed (Netlify)
  // site — the redirect to "/" happened, but a protected page right after
  // still rendered as logged in. Root cause: Auth.js's default for this
  // (@auth/core's init.ts: `config.useSecureCookies ?? url.protocol ===
  // "https:"`) infers secure-cookie mode PER REQUEST from the URL trustHost
  // builds out of forwarded headers — and Netlify's proxying didn't report
  // "https:" consistently on every single invocation. Whichever request
  // guessed wrong used unprefixed cookie names (e.g. plain
  // "authjs.session-token") to try to clear a cookie the browser actually
  // has stored as "__Host-authjs.session-token" (a different cookie, as far
  // as the browser is concerned) — the clear silently no-ops, so the real
  // session cookie survives logout. Setting this explicitly, from a static
  // env check instead of per-request header inference, makes every
  // invocation (this lite config via proxy.ts, and the full one in auth.ts)
  // agree on the same cookie name every time.
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
        session.user.locale = token.locale as AppLocale;
      }
      return session;
    },
  },
};
