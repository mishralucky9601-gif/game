import { DiceOutcomeKey } from "./types";

export const DICE_OUTCOMES: { key: DiceOutcomeKey; label: string; weight: number }[] = [
  { key: "EXTRA_TURN", label: "Extra Turn", weight: 2 },
  { key: "REVIVE_PIECE", label: "Revive a Captured Piece", weight: 1 },
  { key: "RANDOM_TELEPORT", label: "Random Teleport", weight: 1 },
  { key: "LOSE_NEXT_TURN", label: "Lose Next Turn", weight: 1 },
  { key: "BONUS_CARD", label: "Bonus Card", weight: 2 },
  { key: "SHIELD_RANDOM", label: "Shield a Random Piece", weight: 1 },
];

export function rollDice(): DiceOutcomeKey {
  const totalWeight = DICE_OUTCOMES.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const outcome of DICE_OUTCOMES) {
    if (roll < outcome.weight) return outcome.key;
    roll -= outcome.weight;
  }
  return DICE_OUTCOMES[0].key;
}
