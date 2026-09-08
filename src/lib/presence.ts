/**
 * Anonymous (not-logged-in) visitor presence — same "seen in the last 5
 * minutes" heuristic as User.lastActiveAt (see presence-heartbeat.tsx /
 * /api/presence), but for public marketing pages where there's no user
 * account to stamp a column on. Deliberately NOT a database table: an
 * anonymous visit has no identity worth persisting, and a public page
 * writing a DB row per visitor per minute would be an easy, meaningless-
 * data-heavy way for a script to bloat the database. Same in-memory-with-
 * optional-Upstash shape as rate-limit.ts, reused here for the identical
 * "ephemeral, expiring, per-key" problem shape — just a set instead of a
 * counter (a visitor pinging twice is still one visitor, not two).
 */

const ANON_WINDOW_SECONDS = 5 * 60;
const REDIS_KEY = "presence:anon";

const memoryVisitors = new Map<string, number>(); // visitorId -> last-seen ms epoch

function pruneMemory() {
  const cutoff = Date.now() - ANON_WINDOW_SECONDS * 1000;
  for (const [id, seenAt] of memoryVisitors) {
    if (seenAt < cutoff) memoryVisitors.delete(id);
  }
}

async function upstashPipeline(commands: unknown[][]): Promise<Array<{ result: unknown }> | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    if (!res.ok) return null;
    return (await res.json()) as Array<{ result: unknown }>;
  } catch {
    return null;
  }
}

/** Record one anonymous visitor as "seen now" — a sorted-set member keyed by visitorId, scored by timestamp, so a repeat ping just updates the score (still one member) instead of growing the set. */
export async function pingAnonymousVisitor(visitorId: string): Promise<void> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const now = Date.now();
    await upstashPipeline([
      ["ZADD", REDIS_KEY, String(now), visitorId],
      ["ZREMRANGEBYSCORE", REDIS_KEY, "-inf", String(now - ANON_WINDOW_SECONDS * 1000)],
    ]);
    return;
  }
  memoryVisitors.set(visitorId, Date.now());
}

/** Count distinct anonymous visitors seen within the window — the anonymous-visitor equivalent of `prisma.user.count({ where: { lastActiveAt: { gte: onlineWindowAgo } } })`. */
export async function countOnlineAnonymousVisitors(): Promise<number> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const now = Date.now();
    const results = await upstashPipeline([
      ["ZREMRANGEBYSCORE", REDIS_KEY, "-inf", String(now - ANON_WINDOW_SECONDS * 1000)],
      ["ZCARD", REDIS_KEY],
    ]);
    return typeof results?.[1]?.result === "number" ? results[1].result : 0;
  }
  pruneMemory();
  return memoryVisitors.size;
}
