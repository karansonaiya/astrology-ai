import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
  }
}
export class AccountSuspendedError extends Error {
  constructor() {
    super("account_suspended");
  }
}
export class AccountDeletedError extends Error {
  constructor() {
    super("account_deleted");
  }
}

/**
 * Found in a full pre-launch audit: session strategy is JWT with no
 * server-side revocation store, and `status` was never checked past
 * sign-in — an admin suspending/deleting a user only ever flipped the DB
 * row, never the still-valid JWT sitting in that user's browser (default
 * 30-day expiry), so every API route kept working for them regardless.
 * A fresh DB read per call is the direct fix (this app already does a
 * `prisma.user.findUnique` in most routes right after requireUser() for
 * locale anyway, so the added cost is in line with existing per-request
 * DB usage, and correctness here matters more than saving one query).
 */
async function assertActiveStatus(userId: string) {
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (dbUser?.status === "suspended") throw new AccountSuspendedError();
  if (dbUser?.status === "deleted") throw new AccountDeletedError();
}

/** Throws UnauthorizedError if there's no active session, or AccountSuspendedError/AccountDeletedError if the account's real current status blocks it — use inside route handlers. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  await assertActiveStatus(session.user.id);
  return session.user;
}

/** Throws UnauthorizedError / ForbiddenError unless the session role is in allowedRoles, or AccountSuspendedError/AccountDeletedError per requireUser. */
export async function requireAdmin(allowedRoles: string[] = ["admin"]) {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (!allowedRoles.includes(session.user.role)) throw new ForbiddenError();
  await assertActiveStatus(session.user.id);
  return session.user;
}

/** Standard JSON error mapping for the guard errors above plus generic fallbacks. */
export function errorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (err instanceof AccountSuspendedError) return NextResponse.json({ error: "account_suspended" }, { status: 403 });
  if (err instanceof AccountDeletedError) return NextResponse.json({ error: "account_deleted" }, { status: 403 });
  console.error(err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
