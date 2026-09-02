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
