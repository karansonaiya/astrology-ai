/**
 * Nakshatra-based baby naming (Namakaran) — a real, well-established Vedic
 * tradition: each of the 27 Nakshatras is divided into 4 padas (quarters),
 * and each pada has its own traditional starting syllable/sound for naming
 * a child born in it. The syllable itself is 100% real, provider-sourced
 * data (Prokerala's nakshatra_details.additional_info.syllables, verified
 * live 2026-09-16 — a comma-separated 4-syllable set for the whole
 * nakshatra, one per pada in traditional order) combined with the real
 * pada (nakshatra_details.nakshatra.pada) computed from the real birth
 * time/place — this file only picks the right one out of the four, it
 * never invents the syllable set itself. The AI layer (baby-name-
 * suggestion.ts) only ever suggests actual names starting with this real
 * syllable, never decides the syllable.
 */
export function getRealNamingSyllable(nakshatraSyllables: string | null, nakshatraPada: number | null): string | null {
  if (!nakshatraSyllables || !nakshatraPada) return null;
  const syllables = nakshatraSyllables.split(",").map((s) => s.trim()).filter(Boolean);
  return syllables[nakshatraPada - 1] ?? null;
}
