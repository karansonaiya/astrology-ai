import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { birthProfileUpdateSchema } from "@/lib/validations/profile";
import { birthDataCompleteness } from "@/lib/astrology/adapter";
import { geocodeBirthPlace } from "@/lib/geo";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    const completeness = profile
      ? birthDataCompleteness({
          birthDate: profile.birthDate,
          birthTimeKnown: profile.birthTimeKnown,
          birthTime: profile.birthTime,
          birthCity: profile.birthCity,
          timezone: profile.timezone,
        })
      : 0;

    return NextResponse.json({ profile, completeness });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = birthProfileUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const existing = await prisma.birthProfile.findFirst({ where: { userId: user.id, forSelf: true, deletedAt: null } });

    // Re-geocode whenever the city changed (or there's no coordinates yet) —
    // best-effort, a failed/unmatched lookup just leaves coordinates unset
    // rather than failing the save.
    const cityChanged = parsed.data.birthCity && parsed.data.birthCity !== existing?.birthCity;
    const geo =
      parsed.data.birthCity && (cityChanged || existing?.latitude == null)
        ? await geocodeBirthPlace(parsed.data.birthCity, parsed.data.birthCountry).catch(() => null)
        : null;

    const data = {
      name: parsed.data.name,
      gender: parsed.data.gender,
      birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`),
      birthTimeKnown: parsed.data.birthTimeKnown,
      birthTime: parsed.data.birthTimeKnown ? parsed.data.birthTime : null,
      birthCity: parsed.data.birthCity,
      birthCountry: parsed.data.birthCountry,
      ...(geo ? { latitude: geo.latitude, longitude: geo.longitude, timezone: geo.timezone } : { timezone: parsed.data.timezone }),
      primaryInterest: parsed.data.primaryInterest,
      consentSavedAt: new Date(),
    };

    const profile = existing
      ? await prisma.birthProfile.update({ where: { id: existing.id }, data })
      : await prisma.birthProfile.create({ data: { ...data, userId: user.id, forSelf: true } });

    // Birth details (and therefore the chart) may have just changed —
    // invalidate any cached calculation so /api/kundli recomputes instead of
    // serving a stale (or pre-real-provider) chart.
    await prisma.kundliCalculation.deleteMany({ where: { birthProfileId: profile.id } });

    await prisma.consent.create({ data: { userId: user.id, type: "birth_data_storage" } });

    return NextResponse.json({ profile });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.birthProfile.updateMany({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
