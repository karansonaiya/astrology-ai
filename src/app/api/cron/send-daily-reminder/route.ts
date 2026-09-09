import { NextRequest, NextResponse } from "next/server";
import { sendPushToAllSubscribed } from "@/lib/push/send";

/**
 * Unattended daily reminder — "check today's horoscope" is the single
 * biggest lever this kind of app has for bringing someone back once a day
 * (see the product-gap review this followed from: no reminder meant a
 * one-time visitor had nothing pulling them back). Deliberately triggered
 * separately from, and after, generate-horoscopes (see daily-cron.yml) —
 * sending this before that day's content actually exists would link users
 * straight into "not published yet" instead of a real horoscope.
 *
 * Same auth pattern as generate-horoscopes/prefill-panchang: `Authorization:
 * Bearer <CRON_SECRET>` or `?secret=`.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const queryParam = new URL(req.url).searchParams.get("secret");
  return queryParam === secret;
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // One fixed message for everyone subscribed, in English — a push
  // notification's title/body isn't run through generateAstrologyReply (no
  // AI content, no per-user locale rendering worth a DB read per send here);
  // the linked page itself (/horoscope) already renders in the visitor's
  // own locale once opened. Revisit with a per-locale variant only if this
  // turns out to matter in practice.
  const result = await sendPushToAllSubscribed({
    title: "Your daily horoscope is ready ✨",
    body: "See what the stars have to say about your day.",
    url: "/horoscope",
  });

  return NextResponse.json(result);
}
