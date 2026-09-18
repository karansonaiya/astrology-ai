/**
 * Standard 78-card tarot deck (22 Major Arcana + 56 Minor Arcana), with
 * traditional upright/reversed meanings — the same public-domain body of
 * meaning used across virtually every tarot reference (Rider-Waite-derived
 * tradition), summarized in our own words. No card artwork/imagery here —
 * that would need a licensed or newly-illustrated deck; this catalog only
 * backs the text-based reading (name + orientation + meaning).
 *
 * "Real" for this feature (see draw.ts) means: a genuinely random draw and
 * accurate traditional meanings — there is no external live-data provider
 * for tarot the way Prokerala is for astrology, since a tarot draw isn't
 * measuring anything in the world.
 */

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";
export type TarotCard = {
  code: string;
  name: string;
  arcana: "major" | "minor";
  suit?: TarotSuit;
  uprightMeaning: string;
  reversedMeaning: string;
};

const MAJOR_ARCANA: TarotCard[] = [
  { code: "major_00", name: "The Fool", arcana: "major", uprightMeaning: "new beginnings, innocence, a leap of faith", reversedMeaning: "recklessness, hesitation, a risk not yet thought through" },
  { code: "major_01", name: "The Magician", arcana: "major", uprightMeaning: "resourcefulness, willpower, turning ideas into action", reversedMeaning: "untapped potential, manipulation, scattered energy" },
  { code: "major_02", name: "The High Priestess", arcana: "major", uprightMeaning: "intuition, quiet knowing, trusting inner wisdom", reversedMeaning: "disconnection from intuition, secrets, confusion" },
  { code: "major_03", name: "The Empress", arcana: "major", uprightMeaning: "abundance, nurturing, creativity coming to fruition", reversedMeaning: "neglect, creative block, over-dependence on others" },
  { code: "major_04", name: "The Emperor", arcana: "major", uprightMeaning: "structure, stability, steady leadership", reversedMeaning: "rigidity, control issues, lack of discipline" },
  { code: "major_05", name: "The Hierophant", arcana: "major", uprightMeaning: "tradition, guidance, shared values or belief", reversedMeaning: "questioning convention, breaking from tradition" },
  { code: "major_06", name: "The Lovers", arcana: "major", uprightMeaning: "connection, alignment of values, a meaningful choice", reversedMeaning: "imbalance, misalignment, a relationship needing honesty" },
  { code: "major_07", name: "The Chariot", arcana: "major", uprightMeaning: "willpower, determination, moving forward with focus", reversedMeaning: "lack of direction, opposing forces, loss of control" },
  { code: "major_08", name: "Strength", arcana: "major", uprightMeaning: "quiet courage, patience, inner strength over force", reversedMeaning: "self-doubt, low energy, feeling overpowered" },
  { code: "major_09", name: "The Hermit", arcana: "major", uprightMeaning: "introspection, solitude, seeking inner guidance", reversedMeaning: "isolation, withdrawal, avoiding needed reflection" },
  { code: "major_10", name: "Wheel of Fortune", arcana: "major", uprightMeaning: "cycles, change, a turning point arriving", reversedMeaning: "resisting change, feeling stuck, a delay in the cycle" },
  { code: "major_11", name: "Justice", arcana: "major", uprightMeaning: "fairness, truth, cause and effect playing out clearly", reversedMeaning: "unfairness, avoiding accountability, an unresolved imbalance" },
  { code: "major_12", name: "The Hanged Man", arcana: "major", uprightMeaning: "pause, surrender, a new perspective from stillness", reversedMeaning: "resistance to letting go, stalling, delay" },
  { code: "major_13", name: "Death", arcana: "major", uprightMeaning: "ending one chapter to allow a new one, transformation", reversedMeaning: "fear of change, clinging to what's already over" },
  { code: "major_14", name: "Temperance", arcana: "major", uprightMeaning: "balance, patience, blending opposites into harmony", reversedMeaning: "excess, imbalance, impatience" },
  { code: "major_15", name: "The Devil", arcana: "major", uprightMeaning: "attachment, old patterns, feeling bound by a habit", reversedMeaning: "breaking free, reclaiming control, releasing a pattern" },
  { code: "major_16", name: "The Tower", arcana: "major", uprightMeaning: "sudden upheaval, a necessary shake-up, revelation", reversedMeaning: "avoiding an overdue change, fear of collapse" },
  { code: "major_17", name: "The Star", arcana: "major", uprightMeaning: "hope, renewal, gentle guidance after a hard stretch", reversedMeaning: "discouragement, lost hope, disconnection from purpose" },
  { code: "major_18", name: "The Moon", arcana: "major", uprightMeaning: "intuition, uncertainty, things not yet fully clear", reversedMeaning: "confusion lifting, releasing fear, clarity returning" },
  { code: "major_19", name: "The Sun", arcana: "major", uprightMeaning: "joy, vitality, a clear and positive outcome", reversedMeaning: "temporary clouds over happiness, delayed success" },
  { code: "major_20", name: "Judgement", arcana: "major", uprightMeaning: "reflection, reckoning, a call to a higher purpose", reversedMeaning: "self-doubt, avoiding a needed reckoning, harsh self-judgment" },
  { code: "major_21", name: "The World", arcana: "major", uprightMeaning: "completion, fulfillment, a cycle reaching its goal", reversedMeaning: "incompletion, delay, something left unfinished" },
];

const SUIT_MEANINGS: Record<TarotSuit, { theme: string; element: string }> = {
  wands: { theme: "passion, ambition, and creative energy", element: "fire" },
  cups: { theme: "emotion, relationships, and intuition", element: "water" },
  swords: { theme: "thought, conflict, and truth", element: "air" },
  pentacles: { theme: "material matters, work, and security", element: "earth" },
};

const MINOR_RANKS: { rank: string; upright: string; reversed: string }[] = [
  { rank: "Ace", upright: "a fresh spark, pure raw potential", reversed: "a false start, potential not yet seized" },
  { rank: "Two", upright: "a choice or partnership taking shape", reversed: "indecision, imbalance between two paths" },
  { rank: "Three", upright: "early growth, collaboration bearing first results", reversed: "delays, misaligned teamwork" },
  { rank: "Four", upright: "a stable pause, taking stock before the next step", reversed: "stagnation, resisting a needed pause" },
  { rank: "Five", upright: "friction, competition, a test of resolve", reversed: "avoiding conflict, unresolved tension easing" },
  { rank: "Six", upright: "progress, a shared or well-earned win", reversed: "a setback, an old imbalance resurfacing" },
  { rank: "Seven", upright: "a test of commitment, assessing the effort so far", reversed: "self-doubt, second-guessing the path taken" },
  { rank: "Eight", upright: "fast movement, real momentum building", reversed: "scattered effort, momentum stalling" },
  { rank: "Nine", upright: "nearing the goal, resilience after a long stretch", reversed: "fatigue, anxiety close to the finish" },
  { rank: "Ten", upright: "completion of this cycle, a full outcome arriving", reversed: "burden, a cycle ending with unfinished weight" },
  { rank: "Page", upright: "curiosity, a new message or opportunity to explore", reversed: "immaturity, a message misread or delayed" },
  { rank: "Knight", upright: "bold, direct action toward a goal", reversed: "impulsiveness, action without enough thought" },
  { rank: "Queen", upright: "nurturing mastery, intuitive command of this area", reversed: "insecurity, this area's energy turned inward unhealthily" },
  { rank: "King", upright: "confident authority, mature command of this area", reversed: "rigidity, misuse of authority or control" },
];

const MINOR_ARCANA: TarotCard[] = (Object.keys(SUIT_MEANINGS) as TarotSuit[]).flatMap((suit) => {
  const { theme, element } = SUIT_MEANINGS[suit];
  return MINOR_RANKS.map(({ rank, upright, reversed }) => ({
    code: `minor_${suit}_${rank.toLowerCase()}`,
    name: `${rank} of ${suit[0].toUpperCase()}${suit.slice(1)}`,
    arcana: "minor" as const,
    suit,
    uprightMeaning: `${upright} — in the ${element}-linked realm of ${theme}`,
    reversedMeaning: `${reversed} — in the ${element}-linked realm of ${theme}`,
  }));
});

export const TAROT_DECK: TarotCard[] = [...MAJOR_ARCANA, ...MINOR_ARCANA];
