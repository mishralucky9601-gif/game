import { ChaosEventDefinition, ChaosEventKey } from "./types";

export const CHAOS_CATALOG: Record<ChaosEventKey, ChaosEventDefinition> = {
  BOARD_ROTATE: {
    key: "BOARD_ROTATE",
    name: "Board Rotates",
    description: "The board flips 180 degrees for both players.",
  },
  PIECE_SWAP: {
    key: "PIECE_SWAP",
    name: "Pieces Swap",
    description: "Two random pieces on the board swap positions.",
  },
  FOG_OF_WAR: {
    key: "FOG_OF_WAR",
    name: "Fog of War",
    description: "Squares far from your pieces are hidden for 3 turns.",
    durationTurns: 3,
  },
  RANDOM_EXPLOSION: {
    key: "RANDOM_EXPLOSION",
    name: "Random Explosion",
    description: "A random non-king piece is destroyed.",
  },
  TIME_FREEZE: {
    key: "TIME_FREEZE",
    name: "Time Freeze",
    description: "Both players' turn timers are doubled this round.",
  },
  EVERYONE_DRAWS: {
    key: "EVERYONE_DRAWS",
    name: "Everyone Draws",
    description: "Both players draw one random card.",
  },
};

export const ALL_CHAOS_KEYS: ChaosEventKey[] = Object.keys(CHAOS_CATALOG) as ChaosEventKey[];

export function pickRandomChaosEvent(): ChaosEventKey {
  return ALL_CHAOS_KEYS[Math.floor(Math.random() * ALL_CHAOS_KEYS.length)];
}

// Chaos triggers every 2-4 turns (randomized per the design doc).
export function rollNextChaosInterval(): number {
  return 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
}
