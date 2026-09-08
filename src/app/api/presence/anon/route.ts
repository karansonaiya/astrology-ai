import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pingAnonymousVisitor } from "@/lib/presence";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ visitorId: z.string().min(10).max(100) });

/**
 * Public, no login — the anonymous-visitor counterpart to /api/presence
 * (which requires a session). Rate-limited per IP so a script can't spam
 * fabricated visitorIds to inflate the admin's "site visitors now" number
 * for free; a real browser tab only ever calls this once a minute (see
 * anon-presence-heartbeat.tsx), so 20/60s per IP has plenty of headroom for
 * someone with a few tabs open.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit("presence-anon", ip, 20, 60);
  if (!rl.success) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  await pingAnonymousVisitor(parsed.data.visitorId);
  return NextResponse.json({ ok: true });
}
