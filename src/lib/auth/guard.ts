import { auth } from "@/auth";
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

/** Throws UnauthorizedError if there's no active session — use inside route handlers. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user;
}

/** Throws UnauthorizedError / ForbiddenError unless the session role is in allowedRoles. */
export async function requireAdmin(allowedRoles: string[] = ["admin"]) {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (!allowedRoles.includes(session.user.role)) throw new ForbiddenError();
  return session.user;
}

/** Standard JSON error mapping for the guard errors above plus generic fallbacks. */
export function errorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  console.error(err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
