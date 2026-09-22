import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import type { AppLocale } from "@/lib/i18n/config";
import { authConfig } from "@/auth.config";

// Carries a specific reason through to the client via NextAuth's
// CredentialsSignin.code — Auth.js appends this as a `code` query/body param
// separate from the generic `error` type, so the login UI can show a
// specific message instead of one generic failure. See @auth/core/index.js:
// only `error instanceof CredentialsSignin` gets its `.code` forwarded.
class PasswordSignInError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

const providers = [
  // Email + password login. Signup happens separately via POST
  // /api/auth/signup (which hashes the password and creates the user, then
  // the client signs in here right after) — this provider only ever
  // verifies an already-existing account, it never creates one, unlike the
  // paused OTP provider below which used to upsert on first verification.
  Credentials({
    id: "password",
    name: "Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const email = String(raw?.email ?? "").trim().toLowerCase();
      const password = String(raw?.password ?? "");
      if (!email || !password) throw new PasswordSignInError("invalid_request");

      const user = await prisma.user.findUnique({ where: { email } });
      // Same generic code whether the account doesn't exist, was created via
      // Google/OTP with no password set, or the password is simply wrong —
      // never let a login error reveal which of those it was (account
      // enumeration).
      if (!user || !user.passwordHash) throw new PasswordSignInError("invalid_credentials");

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) throw new PasswordSignInError("invalid_credentials");

      if (user.status === "suspended" || user.status === "deleted") {
        throw new PasswordSignInError(`account_${user.status}`);
      }

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),

  // PAUSED 2026-09-18 at the founder's explicit request — phone/email OTP
  // delivery isn't production-ready yet (see lib/notify/sms.ts's mock
  // provider), so it was a real source of "can't log in" reports. Email +
  // password (above) + Google are the only active sign-in paths for now;
  // OTP is meant to come back later as a verification step on top of an
  // account, not as its own signup path. Left as real, complete code
  // (not deleted) so it's a straight re-enable — add this Credentials(...)
  // block back into the `providers` array, and swap login/page.tsx's
  // PasswordFlow back for the OTP tabs UI it replaced.
  //
  // Credentials({
  //   id: "otp",
  //   name: "OTP",
  //   credentials: {
  //     destination: { label: "Destination", type: "text" },
  //     channel: { label: "Channel", type: "text" },
  //     code: { label: "Code", type: "text" },
  //   },
  //   async authorize(raw) {
  //     const destination = String(raw?.destination ?? "").trim();
  //     const channel = String(raw?.channel ?? "");
  //     const code = String(raw?.code ?? "").trim();
  //     if (!destination || !code || (channel !== "phone" && channel !== "email")) {
  //       throw new OtpSignInError("invalid_request");
  //     }
  //
  //     const result = await verifyOtp({ destination, purpose: "login", code });
  //     if (!result.ok) throw new OtpSignInError(result.reason);
  //
  //     const user = await prisma.user.upsert({
  //       where: channel === "phone" ? { phone: destination } : { email: destination },
  //       update: channel === "phone" ? { phoneVerified: new Date() } : { emailVerified: new Date() },
  //       create: {
  //         phone: channel === "phone" ? destination : undefined,
  //         email: channel === "email" ? destination : undefined,
  //         phoneVerified: channel === "phone" ? new Date() : undefined,
  //         emailVerified: channel === "email" ? new Date() : undefined,
  //       },
  //     });
  //
  //     if (user.status === "suspended" || user.status === "deleted") {
  //       throw new OtpSignInError(`account_${user.status}`);
  //     }
  //
  //     await maybePromoteAdmin(user.id, user.email);
  //     return { id: user.id, name: user.name, email: user.email, image: user.image };
  //   },
  // }),

  // Optional — only registered if credentials are present so the login
  // screen doesn't advertise a broken provider in dev.
  //
  // allowDangerousEmailAccountLinking is DELIBERATELY left at its safe
  // default (false) — found in a full pre-launch audit that it used to be
  // set to true here, on the reasoning that "this app's own email-OTP path
  // already verifies the same email ownership Google does, so linking is
  // safe." That reasoning broke the moment OTP was paused (see above):
  // password-signup (api/auth/signup/route.ts) never verifies email
  // ownership at all (no confirmation email, emailVerified stays null).
  // With the flag on, an attacker could sign up with password auth using
  // someone else's real email, and when that real person later used
  // "Continue with Google" with their own address, Auth.js would silently
  // link the OAuth identity into the attacker's existing account — the
  // attacker's password would then keep working on the victim's account
  // indefinitely. Leaving this off means that case now correctly fails
  // with OAuthAccountNotLinked instead — a worse error message, but the
  // safe failure mode. Only turn this back on once password-signup gets
  // real email verification (or once OTP, which does verify, comes back
  // as this app's account-creation gate again).
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
    : []),
];

export async function maybePromoteAdmin(userId: string, email: string | null) {
  const bootstrapList = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && bootstrapList.includes(email.toLowerCase())) {
    await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  events: {
    // Fires once when the Prisma adapter creates a brand-new user — this is
    // the OAuth-flow equivalent of the admin-bootstrap check the Credentials
    // providers run inline in authorize() above.
    async createUser({ user }) {
      if (user.id) await maybePromoteAdmin(user.id, user.email ?? null);
    },
  },
  callbacks: {
    ...authConfig.callbacks, // keep the Prisma-free session() callback as-is
    // Found in a full pre-launch audit: the password provider's own
    // authorize() already blocked a suspended/deleted account, but that
    // check ONLY ran on that one provider — Google sign-in has no
    // authorize() at all (OAuth providers never do), so a suspended/deleted
    // user with Google linked could just click "Continue with Google" and
    // be right back in, moderation completely ignored. This callback runs
    // after every provider (Credentials or OAuth) resolves a real user, so
    // it's the one place that actually covers all of them uniformly.
    async signIn({ user }) {
      if (!user.id) return true;
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { status: true } });
      if (dbUser?.status === "suspended" || dbUser?.status === "deleted") return false;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.locale = dbUser.locale as AppLocale;
          token.status = dbUser.status;
        }
      }
      // Lets the client force this session's JWT to pick up a fresh locale
      // immediately via next-auth/react's `useSession().update({ locale })`
      // — without this, a locale change made through /api/profile/locale
      // (which only updates the DB row) stays invisible to every
      // requireUser()-based route until the user's JWT happens to expire
      // and they sign in again. Found live: a user who switched their UI to
      // Gujarati kept getting new chats created with locale "en" (and an
      // English disclosure appended to an otherwise-Gujarati AI reply)
      // because their session's `locale` claim was still whatever it was
      // at last sign-in. See src/lib/i18n/provider.tsx's setLocale.
      if (trigger === "update" && session?.locale) {
        token.locale = session.locale as AppLocale;
      }
      return token;
    },
  },
});
