import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { muhuratSchema } from "@/lib/validations/muhurat";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";
import { getCachedPanchang, buildLocalMorningDateTime } from "@/lib/astrology/panchang";
import { getRealMuhuratVerdict } from "@/lib/astrology/muhurat";
import { generateMuhuratReading } from "@/lib/ai/muhurat-reading";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Free tier: real Muhurat (auspicious-time) check for ONE chosen date, city,
 * and purpose. Single date only (unlike the paid multi-day report below) —
 * the same single-call shape the existing public /panchang Day view already
 * uses safely (getCachedPanchang, 4 parallel Prokerala calls at most, well
 * under the 5-req/60s account cap on its own). Credit-gated the same way
 * every other free AI feature is; the real verdict itself (favorable/avoid
 * windows) costs nothing and isn't gated on its own — only the AI
 * explanation layered on top is.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = muhuratSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    const { eventType, date, city, country, latitude, longitude } = parsed.data;

    const geo =
      latitude != null && longitude != null
        ? { latitude, longitude, timezone: resolveTimezone(latitude, longitude) }
        : await geocodeBirthPlace(city, country).catch(() => null);
    if (!geo || !geo.timezone) return NextResponse.json({ error: "place_not_found" }, { status: 422 });

    const datetime = buildLocalMorningDateTime(date, geo.timezone);
    const panchang = await getCachedPanchang({ latitude: geo.latitude, longitude: geo.longitude, datetime });
    const verdict = getRealMuhuratVerdict(panchang, eventType, date);

    try {
      await consumeQuestionCredit(user.id, "muhurat-finder");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const reading = await generateMuhuratReading(verdict, locale);

    return NextResponse.json({ verdict, reading, isDemoData: panchang.isDemoData });
  } catch (err) {
    return errorResponse(err);
  }
}
