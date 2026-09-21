/**
 * Traditional Vastu Shastra direction principles — the same "real
 * traditional knowledge, not invented data" treatment as
 * src/lib/tarot/catalog.ts: no live data provider exists for Vastu (it's
 * a system of traditional principles, not a measurement), so "real" here
 * means an accurate, standard reference table the AI reading is grounded
 * in, not the model's own unchecked recall.
 */

export type VastuDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "center";
export type VastuElement =
  | "main_door"
  | "kitchen"
  | "master_bedroom"
  | "pooja_room"
  | "toilet"
  | "staircase"
  | "water_source"
  | "cash_locker";

export const VASTU_DIRECTIONS: { value: VastuDirection; label: string }[] = [
  { value: "N", label: "North" },
  { value: "NE", label: "North-East" },
  { value: "E", label: "East" },
  { value: "SE", label: "South-East" },
  { value: "S", label: "South" },
  { value: "SW", label: "South-West" },
  { value: "W", label: "West" },
  { value: "NW", label: "North-West" },
  { value: "center", label: "Center (Brahmasthan)" },
];

export const VASTU_ELEMENTS: { value: VastuElement; label: string }[] = [
  { value: "main_door", label: "Main entrance/door" },
  { value: "kitchen", label: "Kitchen" },
  { value: "master_bedroom", label: "Master bedroom" },
  { value: "pooja_room", label: "Pooja/prayer room" },
  { value: "toilet", label: "Toilet/bathroom" },
  { value: "staircase", label: "Staircase" },
  { value: "water_source", label: "Water source (borewell/tank)" },
  { value: "cash_locker", label: "Cash locker/safe" },
];

// For each element: which directions are traditionally favorable,
// unfavorable, or neutral, and the traditional reasoning — the trusted
// reference content the AI reading explains and applies to the user's
// specific real answers, never invents on its own.
export const VASTU_PRINCIPLES: Record<VastuElement, { favorable: VastuDirection[]; unfavorable: VastuDirection[]; reasoning: string }> = {
  main_door: {
    favorable: ["N", "NE", "E"],
    unfavorable: ["SW"],
    reasoning: "The main entrance traditionally welcomes positive energy (and the morning sun) best from North, North-East, or East; South-West is considered the most inauspicious direction for the main door.",
  },
  kitchen: {
    favorable: ["SE", "E"],
    unfavorable: ["NE"],
    reasoning: "The kitchen is governed by Agni (fire); South-East is Agni's own traditional corner. East is an acceptable alternative. North-East (Ishan, governed by water/purity) is traditionally avoided for fire-related activity.",
  },
  master_bedroom: {
    favorable: ["SW", "S", "W"],
    unfavorable: ["NE", "SE"],
    reasoning: "South-West is the traditional seat of stability and grounded rest for the head of the household. North-East (spiritually active) and South-East (fire-linked) are traditionally considered too energetically active for restful sleep.",
  },
  pooja_room: {
    favorable: ["NE", "E", "N"],
    unfavorable: ["SW", "S"],
    reasoning: "North-East (Ishan) is the traditional seat of divine/spiritual energy and is the classical placement for a prayer space; South and South-West are traditionally avoided for it.",
  },
  toilet: {
    favorable: ["NW", "W"],
    unfavorable: ["NE", "center"],
    reasoning: "Toilets are traditionally placed North-West or West, away from the spiritually significant North-East and the Brahmasthan (the home's energetic center), which are traditionally kept clear of waste-related function.",
  },
  staircase: {
    favorable: ["S", "SW", "W"],
    unfavorable: ["NE", "center"],
    reasoning: "A staircase traditionally sits in the South, South-West, or West, adding grounded structure there; the North-East and the exact center are traditionally kept open and unobstructed.",
  },
  water_source: {
    favorable: ["NE", "N", "E"],
    unfavorable: ["SW"],
    reasoning: "Water is traditionally associated with the North-East; a borewell, tank, or water feature there is considered auspicious, while South-West (the earth/stability corner) is traditionally avoided for it.",
  },
  cash_locker: {
    favorable: ["N", "S"],
    unfavorable: ["SE"],
    reasoning: "A cash locker or safe traditionally faces North (linked to Kubera, wealth) or is placed in the South wall facing North; South-East (fire-linked) is traditionally avoided for stored wealth.",
  },
};
