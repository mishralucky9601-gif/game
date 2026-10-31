// Core shared types for the Chaos Chess game engine.
// Mirrored (loosely) on the frontend in lib/types.ts so both sides agree on the wire format.

export type PlayerColor = "w" | "b";

export interface PlayerInfo {
  id: string; // socket-independent player id (guest id or user id)
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

export interface CardDefinition {
  key: CardKey;
  name: string;
  description: string;
}

export type DiceOutcomeKey =
  | "EXTRA_TURN"
  | "REVIVE_PIECE"
  | "RANDOM_TELEPORT"
  | "LOSE_NEXT_TURN"
  | "BONUS_CARD"
  | "SHIELD_RANDOM";

export type ChaosEventKey =
  | "BOARD_ROTATE"
  | "PIECE_SWAP"
  | "FOG_OF_WAR"
  | "RANDOM_EXPLOSION"
  | "TIME_FREEZE"
  | "EVERYONE_DRAWS";

export interface ChaosEventDefinition {
  key: ChaosEventKey;
  name: string;
  description: string;
  durationTurns?: number; // for effects that persist (fog of war, board rotate)
}

export interface ActiveEffects {
  frozenSquares: Record<PlayerColor, string | null>; // a square whose piece can't move next turn for that color
  shieldedSquares: string[]; // squares whose piece can't be captured until owner's next turn
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
  captured: Record<PlayerColor, string[]>; // piece letters captured BY this color
  effects: ActiveEffects;
  timerSeconds: number;
  timerDeadline: number | null; // epoch ms
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  winner: PlayerColor | null;
  winReason: string | null;
  lastEvent: { type: string; payload: any } | null;
  chaosCounter: number; // turns since last chaos event
  nextChaosIn: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  username: string;
  playerId: string;
}

export interface MovePayload {
  from: string;
  to: string;
  promotion?: string;
}

export interface PlayCardPayload {
  card: CardKey;
  targetSquare?: string;
  targetSquare2?: string;
}
