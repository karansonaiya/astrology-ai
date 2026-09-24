import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Shared by every cron route (previously duplicated 4x with plain `===`
 * comparisons — found in a full audit: a plain string compare short-circuits
 * on the first mismatched byte, which is a real timing side-channel for a
 * secret compared over HTTP, however impractical to actually exploit against
 * an external scheduler). `timingSafeEqual` requires equal-length buffers,
 * so the length check has to happen first and itself leaks nothing more than
 * `===` already did (both reveal "wrong length" instantly either way).
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured

  const header = req.headers.get("authorization");
  if (header && safeEqual(header, `Bearer ${secret}`)) return true;

  const queryParam = new URL(req.url).searchParams.get("secret");
  if (queryParam && safeEqual(queryParam, secret)) return true;

  return false;
}
