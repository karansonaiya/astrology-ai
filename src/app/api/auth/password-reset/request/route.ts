import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordResetRequestSchema } from "@/lib/validations/auth";
import { issueOtp, OtpCooldownError } from "@/lib/auth/otp";
import { getEmailProvider } from "@/lib/notify/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  const ipLimit = await rateLimit("password-reset-request-ip", ip, 10, 600);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();

  const destLimit = await rateLimit("password-reset-request-dest", email, 5, 600);
  if (!destLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Always the same response whether or not this email has an account —
  // otherwise the response itself would let anyone probe which emails are
  // registered. Only send anything for a real, non-deleted user.
  const user = await prisma.user.findUnique({ where: { email } });
  let devCode: string | undefined;

  if (user && user.status !== "deleted") {
    try {
      const { code, expiresInSeconds } = await issueOtp({ destination: email, channel: "email", purpose: "password_reset", userId: user.id, requestIp: ip });
      await getEmailProvider().send(email, "Reset your Prerna AI password", `Your password reset code is ${code}. It expires in ${Math.round(expiresInSeconds / 60)} minutes. If you didn't request this, you can ignore this email.`);

      // Only ever surfaced outside production, and only when no real email
      // provider is configured — same rule as /api/auth/otp/request.
      const isDev = process.env.NODE_ENV !== "production";
      if (isDev && process.env.EMAIL_PROVIDER !== "resend") devCode = code;
    } catch (err) {
      if (err instanceof OtpCooldownError) {
        return NextResponse.json({ error: "cooldown", retryAfterSeconds: err.retryAfterSeconds }, { status: 429 });
      }
      console.error("[password-reset/request] failed", err);
      // Fall through to the same generic {ok: true} as a real send — don't
      // let a send failure branch differently and reveal the account exists.
    }
  }

  return NextResponse.json({ ok: true, devCode });
}
