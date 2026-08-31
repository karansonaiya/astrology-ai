import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/auth/otp";
import type { AppLocale } from "@/lib/i18n/config";

// Carries a specific reason (result.reason from verifyOtp, or
// "invalid_request" / "account_suspended" / "account_deleted") through to
// the client via NextAuth's CredentialsSignin.code — Auth.js appends this as
// a `code` query/body param separate from the generic `error` type, so the
// login UI can show "wrong code" vs "code expired" vs "too many attempts"
// instead of one generic failure message. See @auth/core/index.js: only
// `error instanceof CredentialsSignin` gets its `.code` forwarded.
class OtpSignInError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

const providers = [
  // Phone or email OTP login/signup — this is also the ONLY signup path in
  // the app (there is no separate signup page/form): the first successful
  // OTP verification for an unrecognized phone/email creates the account
  // via the upsert below. The client first calls POST /api/auth/otp/request
  // to issue+deliver a code, then signs in here with
  // { destination, channel, code } once the user enters it.
  Credentials({
    id: "otp",
    name: "OTP",
    credentials: {
      destination: { label: "Destination", type: "text" },
      channel: { label: "Channel", type: "text" },
      code: { label: "Code", type: "text" },
    },
    async authorize(raw) {
      const destination = String(raw?.destination ?? "").trim();
      const channel = String(raw?.channel ?? "");
      const code = String(raw?.code ?? "").trim();
      if (!destination || !code || (channel !== "phone" && channel !== "email")) {
        throw new OtpSignInError("invalid_request");
      }

      const result = await verifyOtp({ destination, purpose: "login", code });
      if (!result.ok) throw new OtpSignInError(result.reason);

      const user = await prisma.user.upsert({
        where: channel === "phone" ? { phone: destination } : { email: destination },
        update: channel === "phone" ? { phoneVerified: new Date() } : { emailVerified: new Date() },
        create: {
          phone: channel === "phone" ? destination : undefined,
          email: channel === "email" ? destination : undefined,
          phoneVerified: channel === "phone" ? new Date() : undefined,
          emailVerified: channel === "email" ? new Date() : undefined,
        },
      });

      if (user.status === "suspended" || user.status === "deleted") {
        throw new OtpSignInError(`account_${user.status}`);
      }

      await maybePromoteAdmin(user.id, user.email);
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),

  // Optional — only registered if credentials are present so the login
  // screen doesn't advertise a broken provider in dev.
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
    : []),
];

async function maybePromoteAdmin(userId: string, email: string | null) {
  const bootstrapList = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && bootstrapList.includes(email.toLowerCase())) {
    await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
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
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.locale = dbUser.locale as AppLocale;
          token.status = dbUser.status;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
        session.user.locale = token.locale as AppLocale;
      }
      return session;
    },
  },
});
