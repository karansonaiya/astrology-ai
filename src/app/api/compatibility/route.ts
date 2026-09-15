import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { compatibilitySchema } from "@/lib/validations/insights";
import { consumeQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { getCachedKundliByBirthDetails, summarizeKundliForAi } from "@/lib/astrology/adapter";
import { getKundliMatchingProvider, type GunaMilanResult } from "@/lib/astrology/kundli-matching";
import { geocodeBirthPlace, resolveTimezone } from "@/lib/geo";
import type { AppLocale } from "@/lib/i18n/config";
import type { BirthInput } from "@/lib/astrology/adapter";

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
 * else's kundli" lookup), cached by birth details instead (see adapter.ts's
 * getCachedKundliByBirthDetails) so the same person's chart isn't a fresh
 * Prokerala call on every single compatibility check. Only possible when a
 * birth city (or exact coordinates from a CityAutocomplete pick) was given;
 * returns nulls otherwise or on any failure — compatibility already
 * degrades to date-only guidance in that case, same as before this change.
 * Also returns the resolved BirthInput (real lat/lng/timezone) so the real
 * Guna Milan lookup below can reuse it without re-geocoding.
 */
async function computePersonChartSummary(
  person: CompatibilityPerson,
  label: string
): Promise<{ summary?: string; birthInput?: BirthInput }> {
  if (!person.birthCity && (person.latitude == null || person.longitude == null)) return {};
  try {
    const geo =
      person.latitude != null && person.longitude != null
        ? { latitude: person.latitude, longitude: person.longitude, timezone: resolveTimezone(person.latitude, person.longitude) }
        : await geocodeBirthPlace(person.birthCity!, person.birthCountry);
    if (!geo || !geo.timezone) return {};
    const birthInput: BirthInput = {
      birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
      birthTimeKnown: person.birthTimeKnown,
      birthTime: person.birthTimeKnown ? person.birthTime ?? null : null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
    };
    const calc = await getCachedKundliByBirthDetails(birthInput);
    const summary = summarizeKundliForAi(calc);
    return { summary: summary ? `${label}: ${summary}` : undefined, birthInput };
  } catch {
    return {};
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
    const { summary: chartA, birthInput: birthInputA } = await computePersonChartSummary(personA, "Person A's chart");
    const { summary: chartB, birthInput: birthInputB } = await computePersonChartSummary(personB, "Person B's chart");

    // Real classical 36-point Ashtakoot Guna Milan (see kundli-matching.ts)
    // — only attempted when BOTH people have a real resolved birth place
    // AND a known birth time (an inaccurate nakshatra/pada from a fabricated
    // time would give a wrong real score). null (not thrown) on any
    // failure — compatibility still degrades to the text-only reflection,
    // same principle as the chart summaries above.
    let gunaMilan: GunaMilanResult | null = null;
    if (birthInputA && birthInputB) {
      try {
        gunaMilan = await getKundliMatchingProvider().getGunaMilan(birthInputA, birthInputB);
      } catch (err) {
        console.error("[compatibility] getGunaMilan failed:", err);
        gunaMilan = null;
      }
    }

    // Same fix as entitlement.ts's report generation / career/route.ts: this
    // whole prompt is written by us in English — spelling the target
    // language out explicitly, not just relying on the system prompt,
    // reliably keeps the reply in the account's actual locale.
    const langName: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
    const gunaMilanText = gunaMilan
      ? `\n\nReal Ashtakoot Guna Milan result (already calculated, never alter these real facts): total score ${gunaMilan.totalPoints} out of ${gunaMilan.maximumPoints}, overall assessment "${gunaMilan.messageType}" — ${gunaMilan.messageDescription}. Person A's real Koot: Varna ${gunaMilan.girl.koot.varna}, Vashya ${gunaMilan.girl.koot.vasya}, Tara ${gunaMilan.girl.koot.tara}, Yoni ${gunaMilan.girl.koot.yoni}, Graha Maitri ${gunaMilan.girl.koot.grahaMaitri}, Gana ${gunaMilan.girl.koot.gana}, Bhakoot ${gunaMilan.girl.koot.bhakoot}, Nadi ${gunaMilan.girl.koot.nadi}. Person B's real Koot: Varna ${gunaMilan.boy.koot.varna}, Vashya ${gunaMilan.boy.koot.vasya}, Tara ${gunaMilan.boy.koot.tara}, Yoni ${gunaMilan.boy.koot.yoni}, Graha Maitri ${gunaMilan.boy.koot.grahaMaitri}, Gana ${gunaMilan.boy.koot.gana}, Bhakoot ${gunaMilan.boy.koot.bhakoot}, Nadi ${gunaMilan.boy.koot.nadi}. Briefly explain what the real total score and a couple of the most notable real Koot factors traditionally mean, in plain warm language, before the sections below.`
      : "";
    const prompt = `Generate a general relationship compatibility reflection for two people, written entirely in ${langName[locale]}.
Person A — birth date: ${personA.birthDate}, time: ${personA.birthTimeKnown ? personA.birthTime ?? "unknown" : "unknown"}, place: ${personA.birthCity ?? "unknown"}.${chartA ? `\n${chartA}` : ""}
Person B — birth date: ${personB.birthDate}, time: ${personB.birthTimeKnown ? personB.birthTime ?? "unknown" : "unknown"}, place: ${personB.birthCity ?? "unknown"}.${chartB ? `\n${chartB}` : ""}${gunaMilanText}
Structure the answer with three short sections: Communication strengths, Potential friction points, and Reflection questions (2-3 open questions). Keep it supportive and non-deterministic. Do not advise ending the relationship. Never claim marriage compatibility depends on the Guna Milan score alone if one was given — always note that real communication, values, and mutual respect matter at least as much.`;

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
        result: { text: reply.text, gunaMilan },
      },
    });

    return NextResponse.json({ request });
  } catch (err) {
    return errorResponse(err);
  }
}
