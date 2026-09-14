import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { generateNotificationCopy } from "@/lib/ai/notification-copy";

const schema = z.object({ topic: z.string().max(200).optional() });

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(["admin"]);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const copy = await generateNotificationCopy(parsed.data.topic);
    return NextResponse.json(copy);
  } catch (err) {
    return errorResponse(err);
  }
}
