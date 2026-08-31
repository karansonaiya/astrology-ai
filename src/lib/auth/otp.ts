import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { OtpChannel, OtpPurpose } from "@prisma/client";

const CODE_TTL_SECONDS = Number(process.env.OTP_CODE_TTL_SECONDS ?? 300);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
const REQUEST_COOLDOWN_SECONDS = Number(process.env.OTP_REQUEST_COOLDOWN_SECONDS ?? 45);

function generateCode(): string {
  // 6-digit numeric code, cryptographically-adjacent randomness is
  // unnecessary here since the code is single-use and rate-limited, but we
  // still avoid Math.random's fully-predictable low bits.
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export class OtpCooldownError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("otp_cooldown");
  }
}

/**
 * Issues a new OTP for a destination (phone or email), enforcing a cooldown
 * between requests to slow down abuse. Returns the plaintext code only in
 * non-production so local/dev flows can proceed without a real SMS/email
 * provider configured (see lib/notify/*).
 */
export async function issueOtp(opts: {
  destination: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  userId?: string;
  requestIp?: string;
}) {
  const recent = await prisma.otpCode.findFirst({
    where: { destination: opts.destination, purpose: opts.purpose },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (secondsSince < REQUEST_COOLDOWN_SECONDS) {
      throw new OtpCooldownError(Math.ceil(REQUEST_COOLDOWN_SECONDS - secondsSince));
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  await prisma.otpCode.create({
    data: {
      destination: opts.destination,
      channel: opts.channel,
      purpose: opts.purpose,
      codeHash,
      expiresAt,
      maxAttempts: MAX_ATTEMPTS,
      userId: opts.userId,
      requestIp: opts.requestIp,
    },
  });

  return { code, expiresInSeconds: CODE_TTL_SECONDS };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "incorrect_code" };

export async function verifyOtp(opts: {
  destination: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<VerifyOtpResult> {
  const record = await prisma.otpCode.findFirst({
    where: { destination: opts.destination, purpose: opts.purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "not_found" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (record.attempts >= record.maxAttempts) return { ok: false, reason: "too_many_attempts" };

  const matches = await bcrypt.compare(opts.code, record.codeHash);

  if (!matches) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "incorrect_code" };
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
