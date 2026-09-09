import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    // Scoped to the endpoint AND the current user — deleteMany rather than
    // delete-by-id so a mismatched/already-gone row is a silent no-op
    // instead of a 404, since "unsubscribe something that's already gone"
    // isn't really an error from the caller's point of view.
    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
