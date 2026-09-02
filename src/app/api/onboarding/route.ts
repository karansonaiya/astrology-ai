import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { onboardingSchema } from "@/lib/validations/profile";
import { getOrCreateWallet } from "@/lib/credits";
import { linkReferral } from "@/lib/referral";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    if (!data.ageConfirmed || !data.termsAccepted) {
      return NextResponse.json({ error: "consent_required" }, { status: 400 });
    }

    // Prefer the exact coordinates from a CityAutocomplete selection (no
    // network call, no risk of re-geocoding to a different same-named
    // place) — only fall back to free-text geocoding when the client
    // didn't supply them (e.g. JS-disabled, or the user typed past their
    // selection without picking a new one). Best-effort either way: a
    // failed/unmatched lookup just leaves the profile without coordinates
    // rather than failing onboarding.
    const geo =
      data.saveBirthDetails && data.birthDate && data.birthCity
        ? data.latitude != null && data.longitude != null
          ? { latitude: data.latitude, longitude: data.longitude, timezone: resolveTimezone(data.latitude, data.longitude) }
          : await geocodeBirthPlace(data.birthCity, data.birthCountry).catch(() => null)
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          locale: data.locale,
          ageConfirmed: true,
          onboardingCompletedAt: new Date(),
        },
      });

      await tx.consent.createMany({
        data: [
          { userId: user.id, type: "terms_of_service" },
          { userId: user.id, type: "privacy_policy" },
        ],
      });

      if (data.saveBirthDetails && data.birthDate) {
        await tx.consent.create({ data: { userId: user.id, type: "birth_data_storage" } });
        await tx.birthProfile.create({
          data: {
            userId: user.id,
            forSelf: true,
            name: data.name,
            gender: data.gender,
            birthDate: new Date(`${data.birthDate}T00:00:00.000Z`),
            birthTimeKnown: data.birthTimeKnown,
            birthTime: data.birthTimeKnown ? data.birthTime : null,
            birthCity: data.birthCity,
            birthCountry: data.birthCountry,
            latitude: geo?.latitude,
            longitude: geo?.longitude,
            timezone: geo?.timezone ?? data.timezone,
            primaryInterest: data.primaryInterest,
            consentSavedAt: new Date(),
          },
        });
      }
    });

    await getOrCreateWallet(user.id);

    const refCode = req.cookies.get("prerna_ref")?.value;
    if (refCode) await linkReferral(user.id, refCode);

    const res = NextResponse.json({ ok: true });
    if (refCode) res.cookies.set("prerna_ref", "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
