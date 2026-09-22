import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNotificationCopy } from "@/lib/ai/notification-copy";
import { sendPushToAllSubscribed } from "@/lib/push/send";

// Real schedule is every 3 hours (Pabbly Connect) — this margin is under
// that cadence but well above any real retry/duplicate-trigger window, so
// a genuinely-due next send is never blocked, only an actual duplicate.
const MIN_INTERVAL_MS = 2.5 * 60 * 60 * 1000;
const LOCK_KEY = "notification-broadcast";

/**
 * Automatic version of the admin's manual "AI-generated push broadcast"
 * (src/app/(admin)/admin/notifications/page.tsx) — same generate-then-send
 * pipeline (generateNotificationCopy -> sendPushToAllSubscribed), just
 * triggered by daily-cron.yml every 4 hours instead of an admin clicking
 * "Generate with AI" then "Send to all" by hand.
 *
 * Replaces the old fixed-copy send-daily-reminder cron (that route still
 * exists for reference/manual testing but is no longer scheduled) — running
 * BOTH would mean up to 7 pushes a day to the same person, which is too
 * much; slot 0 below covers the exact same "your daily horoscope is ready"
 * moment that route used to own.
 *
 * `?slot=0..5` picks which of the 6 rotating topics/target-pages to use —
 * required from daily-cron.yml (one distinct slot per scheduled time, so
 * consecutive same-day sends are never the same topic), defaults to a
 * time-of-day guess only for convenience when testing this route by hand.
 */
const BROADCAST_SLOTS: { topic: string; url: string }[] = [
  {
    topic: "remind them their daily horoscope for today is ready to check, in a warm, inviting way",
    url: "/horoscope",
  },
  {
    topic: "invite them to add their birth details and see their real Kundli / birth chart if they haven't yet",
    url: "/kundli",
  },
  {
    topic: "invite them to ask Prerna AI a career or work-related question today",
    url: "/career",
  },
  {
    topic: "invite them to explore compatibility or relationship guidance with Prerna AI",
    url: "/compatibility",
  },
  {
    topic: "invite them to try the Palm Reading or Numerology feature using a real photo or their name and birth date",
    url: "/palm-reading",
  },
  {
    topic: "a calm, low-key evening check-in inviting quiet reflection on their day through Prerna AI's chat",
    url: "/chat",
  },
];

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

  const slotParam = new URL(req.url).searchParams.get("slot");
  // Fallback (manual/browser testing only): guess a slot from the current
  // UTC hour, spaced the same 4 hours apart as the real schedule.
  const slot = slotParam != null ? Number(slotParam) : Math.floor(new Date().getUTCHours() / 4) % BROADCAST_SLOTS.length;
  if (!Number.isInteger(slot) || slot < 0 || slot >= BROADCAST_SLOTS.length) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }

  // Found in a full audit: no protection existed against this route firing
  // twice in a short window (a scheduler retry, a second workflow, or a
  // manual re-trigger) — every subscriber would get two real notifications,
  // the exact failure mode that moved this off GitHub Actions in the first
  // place. This lock doesn't fix a scheduling-reliability problem (that's
  // Pabbly's job), it just makes the route itself refuse to double-send
  // regardless of how many times something calls it too soon.
  const lock = await prisma.cronRunLock.findUnique({ where: { key: LOCK_KEY } });
  if (lock && Date.now() - lock.lastRunAt.getTime() < MIN_INTERVAL_MS) {
    return NextResponse.json({ skipped: true, reason: "already sent recently", lastRunAt: lock.lastRunAt });
  }

  const { topic, url } = BROADCAST_SLOTS[slot];
  const copy = await generateNotificationCopy(topic);
  const result = await sendPushToAllSubscribed({ title: copy.title, body: copy.body, url });

  await prisma.cronRunLock.upsert({
    where: { key: LOCK_KEY },
    create: { key: LOCK_KEY, lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  });

  return NextResponse.json({ slot, topic, copy, result });
}
