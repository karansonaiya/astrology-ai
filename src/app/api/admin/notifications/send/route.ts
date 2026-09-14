import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";
import { sendPushToAllSubscribed, isPushConfigured } from "@/lib/push/send";

const schema = z.object({
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(150),
  url: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(["admin"]);
    if (!isPushConfigured()) return NextResponse.json({ error: "push_not_configured" }, { status: 409 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const result = await sendPushToAllSubscribed({
      title: parsed.data.title,
      body: parsed.data.body,
      url: parsed.data.url || "/",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
