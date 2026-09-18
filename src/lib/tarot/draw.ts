import { randomInt } from "crypto";
import { TAROT_DECK, type TarotCard } from "./catalog";

export type TarotOrientation = "upright" | "reversed";
export type TarotSpreadPosition = "past" | "present" | "future";
export type DrawnTarotCard = { card: TarotCard; orientation: TarotOrientation; position: TarotSpreadPosition };

const POSITIONS: TarotSpreadPosition[] = ["past", "present", "future"];

/**
 * A real random draw (Node's crypto.randomInt, not Math.random) of 3 unique
 * cards for a Past/Present/Future spread, each independently upright or
 * reversed — the actual "real" part of this feature (see catalog.ts's
 * header comment): no external data source, just a genuinely random pull
 * from the full 78-card deck every time.
 */
export function drawThreeCardSpread(): DrawnTarotCard[] {
  const deck = [...TAROT_DECK];
  const drawn: TarotCard[] = [];
  for (let i = 0; i < 3; i++) {
    const index = randomInt(0, deck.length);
    drawn.push(deck[index]);
    deck.splice(index, 1);
  }
  return drawn.map((card, i) => ({
    card,
    orientation: randomInt(0, 2) === 0 ? "upright" : "reversed",
    position: POSITIONS[i],
  }));
}
