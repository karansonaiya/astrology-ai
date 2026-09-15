import { getProkeralaToken, fetchProkeralaWithRetry, buildBirthDateTime } from "./adapter";
import type { BirthInput } from "./adapter";

/**
 * Real classical Ashtakoot Guna Milan (36-point Kundli Milan / marriage
 * matching) — Prokerala DOES have a dedicated endpoint for this (verified
 * live: `/v2/astrology/kundli-matching`, confirmed a real product, not a
 * 404, once the correct param names `girl_dob`/`boy_dob` were used), unlike
 * Kaal Sarp Dosha/Sade Sati which genuinely have no endpoint. This is used
 * directly rather than hand-computing the 8 Kootas (Varna, Vashya, Tara,
 * Yoni, Graha Maitri, Gana, Bhakoot, Nadi) from classical lookup tables
 * ourselves — Prokerala's own real, authoritative calculation is strictly
 * more reliable than re-deriving it, same "always prefer real provider
 * data" principle as the rest of this app.
 *
 * Real per-koota POINT BREAKDOWN is NOT returned by this endpoint (only
 * each koota's real category per person, e.g. "Varna: Kshatriya", plus the
 * real aggregate total_points/maximum_points) — so this app shows exactly
 * that real breakdown-by-category and the real total, and deliberately
 * does NOT invent a per-koota point split Prokerala doesn't provide.
 *
 * Needs a real, known birth time for both people (unlike a single-person
 * chart, where nakshatra/rasi tolerate a noon fallback reasonably well) -
 * an inaccurate nakshatra/pada from a fabricated time would produce a
 * wrong real score, which is worse than showing none; getGunaMilan returns
 * null rather than guessing when either person's birth time isn't known.
 */
export type KootSet = {
  varna: string;
  vasya: string;
  tara: string;
  yoni: string;
  grahaMaitri: string;
  gana: string;
  bhakoot: string;
  nadi: string;
};
export type PersonMatchInfo = {
  koot: KootSet;
  nakshatra: { name: string; pada: number; lord: string };
  rasi: { name: string; lord: string };
};
export type GunaMilanResult = {
  provider: string;
  isDemoData: boolean;
  girl: PersonMatchInfo;
  boy: PersonMatchInfo;
  messageType: string;
  messageDescription: string;
  totalPoints: number;
  maximumPoints: number;
};

export interface KundliMatchingProvider {
  getGunaMilan(girl: BirthInput, boy: BirthInput): Promise<GunaMilanResult | null>;
}

/** Deterministic, clearly-labeled demo data — same spirit as MockAstrologyProvider. */
class MockKundliMatchingProvider implements KundliMatchingProvider {
  async getGunaMilan(girl: BirthInput, boy: BirthInput): Promise<GunaMilanResult | null> {
    if (!girl.birthTimeKnown || !boy.birthTimeKnown) return null;
    const seed = (girl.birthDate.getUTCDate() + boy.birthDate.getUTCDate()) % 37;
    const demoPerson = (label: string): PersonMatchInfo => ({
      koot: {
        varna: `Kshatriya (demo ${label})`,
        vasya: `Manava (demo ${label})`,
        tara: `Ashwini (demo ${label})`,
        yoni: `Horse (demo ${label})`,
        grahaMaitri: `Jupiter (demo ${label})`,
        gana: `Deva (demo ${label})`,
        bhakoot: `Mesha (demo ${label})`,
        nadi: `Aadi (demo ${label})`,
      },
      nakshatra: { name: "Ashwini (demo)", pada: 1, lord: "Ketu (demo)" },
      rasi: { name: "Mesha (demo)", lord: "Mars (demo)" },
    });
    return {
      provider: "mock",
      isDemoData: true,
      girl: demoPerson("girl"),
      boy: demoPerson("boy"),
      messageType: seed >= 18 ? "good" : "average",
      messageDescription: "Demo/placeholder compatibility message — not a real calculation.",
      totalPoints: seed,
      maximumPoints: 36,
    };
  }
}

type ApiLord = { name?: string };
type ApiKoot = {
  varna?: string;
  vasya?: string;
  tara?: string;
  yoni?: string;
  graha_maitri?: string;
  gana?: string;
  bhakoot?: string;
  nadi?: string;
};
type ApiPersonInfo = {
  koot?: ApiKoot;
  nakshatra?: { name?: string; pada?: number; lord?: ApiLord };
  rasi?: { name?: string; lord?: ApiLord };
};

function toPersonInfo(info: ApiPersonInfo | undefined): PersonMatchInfo {
  return {
    koot: {
      varna: info?.koot?.varna ?? "",
      vasya: info?.koot?.vasya ?? "",
      tara: info?.koot?.tara ?? "",
      yoni: info?.koot?.yoni ?? "",
      grahaMaitri: info?.koot?.graha_maitri ?? "",
      gana: info?.koot?.gana ?? "",
      bhakoot: info?.koot?.bhakoot ?? "",
      nadi: info?.koot?.nadi ?? "",
    },
    nakshatra: { name: info?.nakshatra?.name ?? "", pada: info?.nakshatra?.pada ?? 0, lord: info?.nakshatra?.lord?.name ?? "" },
    rasi: { name: info?.rasi?.name ?? "", lord: info?.rasi?.lord?.name ?? "" },
  };
}

class ProkeralaKundliMatchingProvider implements KundliMatchingProvider {
  async getGunaMilan(girl: BirthInput, boy: BirthInput): Promise<GunaMilanResult | null> {
    if (girl.latitude == null || girl.longitude == null || boy.latitude == null || boy.longitude == null) return null;
    if (!girl.birthTimeKnown || !boy.birthTimeKnown) return null;

    const token = await getProkeralaToken();
    const qs = new URLSearchParams({
      ayanamsa: "1",
      girl_coordinates: `${girl.latitude},${girl.longitude}`,
      girl_dob: buildBirthDateTime(girl),
      boy_coordinates: `${boy.latitude},${boy.longitude}`,
      boy_dob: buildBirthDateTime(boy),
      la: "en",
    }).toString();

    const res = await fetchProkeralaWithRetry(`https://api.prokerala.com/v2/astrology/kundli-matching?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Prokerala kundli-matching API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const d = json?.data;
    if (!d) return null;

    return {
      provider: "prokerala",
      isDemoData: false,
      girl: toPersonInfo(d.girl_info),
      boy: toPersonInfo(d.boy_info),
      messageType: d.message?.type ?? "",
      messageDescription: d.message?.description ?? "",
      totalPoints: typeof d.guna_milan?.total_points === "number" ? d.guna_milan.total_points : 0,
      maximumPoints: typeof d.guna_milan?.maximum_points === "number" ? d.guna_milan.maximum_points : 36,
    };
  }
}

export function getKundliMatchingProvider(): KundliMatchingProvider {
  return process.env.ASTROLOGY_PROVIDER === "prokerala" ? new ProkeralaKundliMatchingProvider() : new MockKundliMatchingProvider();
}
