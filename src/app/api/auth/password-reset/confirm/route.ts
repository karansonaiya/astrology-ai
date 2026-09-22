import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordResetConfirmSchema } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit("password-reset-confirm-ip", ip, 20, 600);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = passwordResetConfirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic code as an unknown code below — never reveal via a
  // different error that this email has no account.
  if (!user) return NextResponse.json({ error: "incorrect_code" }, { status: 400 });

  // Found in a full audit: the status check used to run BEFORE verifyOtp,
  // which meant anyone could submit a random 6-digit guess against a known
  // email and learn from the response alone whether that account is
  // suspended/deleted (403) vs. just wrong (400) — a real account-status
  // leak requiring no actual proof of owning the account. Checking status
  // only AFTER a real code is verified closes that: a wrong guess always
  // gets the same "incorrect_code" regardless of the account's real state,
  // matching how the password provider itself already orders this (verify
  // credentials first, reveal status second).
  const result = await verifyOtp({ destination: email, purpose: "password_reset", code: parsed.data.code });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  if (user.status === "suspended" || user.status === "deleted") {
    return NextResponse.json({ error: `account_${user.status}` }, { status: 403 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
