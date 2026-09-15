import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { babyNameSchema } from "@/lib/validations/baby-names";
import { getCachedKundliByBirthDetails } from "@/lib/astrology/adapter";
import { getRealNamingSyllable } from "@/lib/naming/nakshatra-names";
import { generateBabyNameSuggestions } from "@/lib/ai/baby-name-suggestion";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Free tier: 8 real name suggestions, grounded in the real Nakshatra +
 * pada + traditional starting syllable for the given birth details (see
 * nakshatra-names.ts). Deliberately ephemeral like palm-reading/numerology
 * — no persistence beyond the shared KundliLookupCache the astrology
 * adapter already maintains (real data reuse, not this feature's own
 * table). Credit-gated the same way every other free AI feature is.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = babyNameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

    const { birthDate, birthTimeKnown, birthTime, birthCity, birthCountry, latitude, longitude, genderPreference } = parsed.data;

    const geo =
      latitude != null && longitude != null
        ? { latitude, longitude, timezone: resolveTimezone(latitude, longitude) }
        : await geocodeBirthPlace(birthCity, birthCountry).catch(() => null);
    if (!geo || !geo.timezone) return NextResponse.json({ error: "place_not_found" }, { status: 422 });

    const calc = await getCachedKundliByBirthDetails({
      birthDate: new Date(`${birthDate}T00:00:00.000Z`),
      birthTimeKnown,
      birthTime: birthTimeKnown ? birthTime ?? null : null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
    });

    const syllable = getRealNamingSyllable(calc.nakshatraSyllables, calc.nakshatraPada);
    if (!calc.nakshatra || !syllable) {
      return NextResponse.json({ error: "nakshatra_unavailable" }, { status: 422 });
    }

    try {
      await consumeQuestionCredit(user.id, "baby-names");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const result = await generateBabyNameSuggestions(syllable, calc.nakshatra, genderPreference, 8, locale);

    return NextResponse.json({
      nakshatra: calc.nakshatra,
      pada: calc.nakshatraPada,
      syllable,
      birthTimeApproximate: !birthTimeKnown,
      ...result,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
