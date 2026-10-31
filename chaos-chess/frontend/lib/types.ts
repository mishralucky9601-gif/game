export type PlayerColor = "w" | "b";

export interface PlayerInfo {
  id: string;
  username: string;
  color: PlayerColor;
  connected: boolean;
}

export type CardKey =
  | "SKIP"
  | "DRAW_TWO"
  | "SWAP_PIECES"
  | "FREEZE_PIECE"
  | "DOUBLE_MOVE"
  | "SHIELD";

export const CARD_INFO: Record<CardKey, { name: string; description: string; emoji: string }> = {
  SKIP: { name: "Skip", description: "Opponent loses their next turn.", emoji: "⏭️" },
  DRAW_TWO: { name: "Draw Two", description: "Opponent draws two cards.", emoji: "🃏" },
  SWAP_PIECES: { name: "Swap Pieces", description: "Swap two of your own pieces.", emoji: "🔄" },
  FREEZE_PIECE: { name: "Freeze Piece", description: "Freeze an opponent piece for a turn.", emoji: "🧊" },
  DOUBLE_MOVE: { name: "Double Move", description: "Take an extra move this turn.", emoji: "⚡" },
  SHIELD: { name: "Shield", description: "Protect a piece from capture.", emoji: "🛡️" },
};

export type DiceOutcomeKey =
  | "EXTRA_TURN"
  | "REVIVE_PIECE"
  | "RANDOM_TELEPORT"
  | "LOSE_NEXT_TURN"
  | "BONUS_CARD"
  | "SHIELD_RANDOM";

export const DICE_INFO: Record<DiceOutcomeKey, { label: string; emoji: string }> = {
  EXTRA_TURN: { label: "Extra Turn!", emoji: "🎯" },
  REVIVE_PIECE: { label: "Piece Revived!", emoji: "💫" },
  RANDOM_TELEPORT: { label: "Random Teleport!", emoji: "🌀" },
  LOSE_NEXT_TURN: { label: "Lose Next Turn", emoji: "💤" },
  BONUS_CARD: { label: "Bonus Card!", emoji: "🎁" },
  SHIELD_RANDOM: { label: "Random Shield!", emoji: "🛡️" },
};

export type ChaosEventKey =
  | "BOARD_ROTATE"
  | "PIECE_SWAP"
  | "FOG_OF_WAR"
  | "RANDOM_EXPLOSION"
  | "TIME_FREEZE"
  | "EVERYONE_DRAWS";

export const CHAOS_INFO: Record<ChaosEventKey, { name: string; description: string; emoji: string }> = {
  BOARD_ROTATE: { name: "Board Rotates!", description: "The board flips 180°.", emoji: "🔃" },
  PIECE_SWAP: { name: "Pieces Swap!", description: "Two random pieces swap places.", emoji: "🔀" },
  FOG_OF_WAR: { name: "Fog of War!", description: "Distant squares are hidden for 3 turns.", emoji: "🌫️" },
  RANDOM_EXPLOSION: { name: "Random Explosion!", description: "A random piece is destroyed.", emoji: "💥" },
  TIME_FREEZE: { name: "Time Freeze!", description: "Turn timers are doubled.", emoji: "❄️" },
  EVERYONE_DRAWS: { name: "Everyone Draws!", description: "Both players draw a card.", emoji: "🎴" },
};

export interface ActiveEffects {
  frozenSquares: Record<PlayerColor, string | null>;
  shieldedSquares: string[];
  skipNextTurn: Record<PlayerColor, boolean>;
  fogOfWarUntilTurn: number | null;
  boardRotated: boolean;
  extraMovesRemaining: Record<PlayerColor, number>;
}

export interface GameStateSnapshot {
  roomCode: string;
  fen: string;
  turn: PlayerColor;
  turnNumber: number;
  players: PlayerInfo[];
  hands: Record<PlayerColor, CardKey[]>;
  deckCount: number;
  captured: Record<PlayerColor, string[]>;
  effects: ActiveEffects;
  timerSeconds: number;
  timerDeadline: number | null;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  winner: PlayerColor | null;
  winReason: string | null;
  lastEvent: { type: string; payload: any } | null;
  chaosCounter: number;
  nextChaosIn: number;
}
