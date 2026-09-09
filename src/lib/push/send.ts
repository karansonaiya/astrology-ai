import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Web Push sender — same opt-in-via-env-var shape as the AI/astrology/
 * payment provider abstractions (see CLAUDE.md): if VAPID keys aren't
 * configured, every function here is a silent no-op rather than throwing,
 * so the app runs fine with zero push config (matching how ads/AdSense
 * degrade to "render nothing" without NEXT_PUBLIC_ADSENSE_*).
 */
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT;

const isConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY && SUBJECT);
if (isConfigured) {
  webpush.setVapidDetails(SUBJECT!, PUBLIC_KEY!, PRIVATE_KEY!);
}

export function isPushConfigured() {
  return isConfigured;
}

export type PushPayload = { title: string; body: string; url?: string };

/**
 * Sends to every subscription a user has (multiple browsers/devices are
 * normal — see PushSubscription's own header comment). A 404/410 response
 * means the push service itself says this endpoint is gone (browser
 * unsubscribed, uninstalled the PWA, or the endpoint just expired) — that
 * subscription row is deleted so future sends don't keep retrying a dead
 * endpoint. Any other failure (network blip, the push service being down)
 * is left alone; it's not evidence the subscription itself is bad.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!isConfigured) return { sent: 0, removed: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let removed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        removed++;
      }
      // Any other error (network blip, push service outage) — leave the
      // subscription in place, it may well succeed next time.
    }
  }

  return { sent, removed };
}

/**
 * Broadcasts to every subscribed user — used by the daily-reminder cron.
 * Sequential per user (not Promise.all across the whole table) so a large
 * subscriber base doesn't fire thousands of concurrent requests against the
 * push services at once; this only runs once a day, so total wall-clock
 * time isn't under tight pressure the way a user-facing request is.
 */
export async function sendPushToAllSubscribed(payload: PushPayload): Promise<{ users: number; sent: number; removed: number }> {
  if (!isConfigured) return { users: 0, sent: 0, removed: 0 };

  const userIds = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  let sent = 0;
  let removed = 0;
  for (const { userId } of userIds) {
    const result = await sendPushToUser(userId, payload);
    sent += result.sent;
    removed += result.removed;
  }

  return { users: userIds.length, sent, removed };
}
