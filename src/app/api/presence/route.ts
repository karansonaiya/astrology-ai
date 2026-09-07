import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

/**
 * Called by src/components/layout/presence-heartbeat.tsx roughly once a
 * minute from any authenticated page. Powers the admin dashboard's "online
 * now" tile (see /api/admin/stats) — a "last seen recently" heuristic, not
 * real-time websocket presence. Deliberately tiny and side-effect-free
 * beyond the timestamp write so it's cheap to call often.
 */
export async function POST() {
  try {
    const user = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
