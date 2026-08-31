/**
 * Rate limiting abstraction. Uses Upstash Redis (REST API, works from any
 * serverless runtime) when configured; otherwise falls back to an in-memory
 * limiter that only protects a single server instance — fine for local dev,
 * NOT sufficient for a multi-instance production deployment. Configure
 * Upstash before going live with real traffic.
 */

type LimitResult = { success: boolean; remaining: number; resetAt: number };

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, max: number, windowSeconds: number): LimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: max - 1, resetAt };
  }

  if (existing.count >= max) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

async function upstashLimit(key: string, max: number, windowSeconds: number): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  // Fixed-window counter using INCR + EXPIRE via the Upstash REST pipeline.
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
    ]),
  });

  if (!res.ok) {
    // Fail open on infra errors rather than blocking all traffic, but log loudly.
    console.error("[rate-limit] Upstash request failed, failing open");
    return { success: true, remaining: max, resetAt: Date.now() + windowSeconds * 1000 };
  }

  const [incrResult] = (await res.json()) as Array<{ result: number }>;
  const count = incrResult.result;
  const resetAt = Date.now() + windowSeconds * 1000;

  return count > max
    ? { success: false, remaining: 0, resetAt }
    : { success: true, remaining: max - count, resetAt };
}

/** Rate limit an action keyed by an identifier (user id, IP, phone, etc). */
export async function rateLimit(scope: string, identifier: string, max: number, windowSeconds: number) {
  const key = `ratelimit:${scope}:${identifier}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashLimit(key, max, windowSeconds);
  }
  return memoryLimit(key, max, windowSeconds);
}

/** Best-effort client IP extraction behind common proxies (Vercel, etc). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
