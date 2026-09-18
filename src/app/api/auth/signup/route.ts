import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordSignupSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { maybePromoteAdmin } from "@/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit("signup-ip", ip, 10, 600);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = passwordSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Same generic response either way at the login step (see auth.ts's
  // "password" provider) — but signup itself DOES need to tell a genuine
  // new user apart from someone re-hitting an existing address, so they
  // know to log in instead of getting a confusing "signup succeeded" that
  // didn't actually create a second account.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  await maybePromoteAdmin(user.id, user.email);

  return NextResponse.json({ ok: true });
}
