import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { compatibilitySchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { getAstrologyProvider, summarizeKundliForAi } from "@/lib/astrology/adapter";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";
import type { AppLocale } from "@/lib/i18n/config";

type CompatibilityPerson = {
  label?: string;
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime?: string;
  birthCity?: string;
  birthCountry?: string;
  latitude?: number;
  longitude?: number;
};

/**
 * Best-effort real chart for one side of a compatibility request — not
 * persisted as a BirthProfile (this is ad hoc, like the "view someone
 * else's kundli" lookup), just computed once for this prompt. Only
 * possible when a birth city (or exact coordinates from a CityAutocomplete
 * pick) was given; silently returns undefined otherwise or on any failure —
 * compatibility already degrades to date-only guidance in that case, same
 * as before this change.
 */
async function computePersonChartSummary(person: CompatibilityPerson, label: string): Promise<string | undefined> {
  if (!person.birthCity && (person.latitude == null || person.longitude == null)) return undefined;
  try {
    const geo =
      person.latitude != null && person.longitude != null
        ? { latitude: person.latitude, longitude: person.longitude, timezone: resolveTimezone(person.latitude, person.longitude) }
        : await geocodeBirthPlace(person.birthCity!, person.birthCountry);
    if (!geo || !geo.timezone) return undefined;
    const calc = await getAstrologyProvider().calculateKundli({
      birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
      birthTimeKnown: person.birthTimeKnown,
      birthTime: person.birthTimeKnown ? person.birthTime ?? null : null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
    });
    const summary = summarizeKundliForAi(calc);
    return summary ? `${label}: ${summary}` : undefined;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const requests = await prisma.compatibilityRequest.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ requests });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = compatibilitySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    try {
      await consumeQuestionCredit(user.id, "compatibility");
    } catch (err) {
      if (err instanceof OutOfCreditsError) return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      throw err;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const { personA, personB } = parsed.data;

    // Sequential, not parallel — each calculateKundli() call already fires
    // 2-3 concurrent Prokerala requests on its own (see adapter.ts); doing
    // both people at once could stack up to 6 concurrent requests against
    // Prokerala's 5-req/60s account-wide cap.
    const chartA = await computePersonChartSummary(personA, "Person A's chart");
    const chartB = await computePersonChartSummary(personB, "Person B's chart");

    const prompt = `Generate a general relationship compatibility reflection for two people.
Person A — birth date: ${personA.birthDate}, time: ${personA.birthTimeKnown ? personA.birthTime ?? "unknown" : "unknown"}, place: ${personA.birthCity ?? "unknown"}.${chartA ? `\n${chartA}` : ""}
Person B — birth date: ${personB.birthDate}, time: ${personB.birthTimeKnown ? personB.birthTime ?? "unknown" : "unknown"}, place: ${personB.birthCity ?? "unknown"}.${chartB ? `\n${chartB}` : ""}
Structure the answer with three short sections: Communication strengths, Potential friction points, and Reflection questions (2-3 open questions). Keep it supportive and non-deterministic. Do not advise ending the relationship.`;

    const reply = await generateAstrologyReply({
      userId: user.id,
      locale,
      history: [],
      userMessage: prompt,
      feature: "compatibility",
    });

    const request = await prisma.compatibilityRequest.create({
      data: {
        userId: user.id,
        personALabel: personA.label ?? "You",
        personAData: personA,
        personBLabel: personB.label ?? "Partner",
        personBData: personB,
        personBSavedConsent: parsed.data.savePersonBConsent,
        result: { text: reply.text },
      },
    });

    return NextResponse.json({ request });
  } catch (err) {
    return errorResponse(err);
  }
}
