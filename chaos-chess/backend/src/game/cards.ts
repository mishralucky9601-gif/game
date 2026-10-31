import { CardDefinition, CardKey } from "./types";

export const CARD_CATALOG: Record<CardKey, CardDefinition> = {
  SKIP: {
    key: "SKIP",
    name: "Skip",
    description: "Your opponent loses their next turn.",
  },
  DRAW_TWO: {
    key: "DRAW_TWO",
    name: "Draw Two",
    description: "Your opponent draws two extra cards.",
  },
  SWAP_PIECES: {
    key: "SWAP_PIECES",
    name: "Swap Pieces",
    description: "Swap the positions of two of your own pieces.",
  },
  FREEZE_PIECE: {
    key: "FREEZE_PIECE",
    name: "Freeze Piece",
    description: "Target an opponent piece — it cannot move on their next turn.",
  },
  DOUBLE_MOVE: {
    key: "DOUBLE_MOVE",
    name: "Double Move",
    description: "Take an extra move immediately after this turn's move.",
  },
  SHIELD: {
    key: "SHIELD",
    name: "Shield",
    description: "Protect one of your pieces from capture until your next turn.",
  },
};

export const ALL_CARD_KEYS: CardKey[] = Object.keys(CARD_CATALOG) as CardKey[];

export function drawRandomCards(count: number): CardKey[] {
  const cards: CardKey[] = [];
  for (let i = 0; i < count; i++) {
    const key = ALL_CARD_KEYS[Math.floor(Math.random() * ALL_CARD_KEYS.length)];
    cards.push(key);
  }
  return cards;
}
