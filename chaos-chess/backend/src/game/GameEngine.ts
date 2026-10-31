import { Chess } from "chess.js";
import {
  ActiveEffects,
  CardKey,
  ChaosEventKey,
  DiceOutcomeKey,
  GameStateSnapshot,
  PlayerColor,
  PlayerInfo,
} from "./types";
import { drawRandomCards } from "./cards";
import { rollDice } from "./dice";
import { pickRandomChaosEvent, rollNextChaosInterval } from "./chaos";

const TURN_SECONDS_DEFAULT = 60;
const STARTING_HAND_SIZE = 3;

export class GameEngine {
  roomCode: string;
  chess: Chess;
  players: Record<PlayerColor, PlayerInfo | null> = { w: null, b: null };
  hands: Record<PlayerColor, CardKey[]> = { w: [], b: [] };
  deckCount = 40;
  captured: Record<PlayerColor, string[]> = { w: [], b: [] };
  effects: ActiveEffects;
  turnNumber = 1;
  timerSeconds: number;
  timerDeadline: number | null = null;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED" = "WAITING";
  winner: PlayerColor | null = null;
  winReason: string | null = null;
  lastEvent: { type: string; payload: any } | null = null;
  chaosCounter = 0;
  nextChaosIn: number;
  turnTimer: NodeJS.Timeout | null = null;
  onTimeout: ((color: PlayerColor) => void) | null = null;

  constructor(roomCode: string, turnSeconds: number = TURN_SECONDS_DEFAULT) {
    this.roomCode = roomCode;
    this.chess = new Chess();
    this.timerSeconds = turnSeconds;
    this.nextChaosIn = rollNextChaosInterval();
    this.effects = {
      frozenSquares: { w: null, b: null },
      shieldedSquares: [],
      skipNextTurn: { w: false, b: false },
      fogOfWarUntilTurn: null,
      boardRotated: false,
      extraMovesRemaining: { w: 0, b: 0 },
    };
  }

  addPlayer(id: string, username: string): PlayerColor | null {
    if (this.players.w && this.players.w.id === id) return "w";
    if (this.players.b && this.players.b.id === id) return "b";
    if (!this.players.w) {
      this.players.w = { id, username, color: "w", connected: true };
      return "w";
    }
    if (!this.players.b) {
      this.players.b = { id, username, color: "b", connected: true };
      return "b";
    }
    return null; // room full
  }

  setConnected(color: PlayerColor, connected: boolean) {
    if (this.players[color]) this.players[color]!.connected = connected;
  }

  bothPlayersPresent() {
    return !!this.players.w && !!this.players.b;
  }

  start() {
    if (this.status !== "WAITING") return;
    this.status = "IN_PROGRESS";
    this.hands.w = drawRandomCards(STARTING_HAND_SIZE);
    this.hands.b = drawRandomCards(STARTING_HAND_SIZE);
    this.deckCount -= STARTING_HAND_SIZE * 2;
    this.startTurnTimer();
  }

  get turn(): PlayerColor {
    return this.chess.turn() as PlayerColor;
  }

  colorOf(playerId: string): PlayerColor | null {
    if (this.players.w?.id === playerId) return "w";
    if (this.players.b?.id === playerId) return "b";
    return null;
  }

  // ---------------- Timer ----------------
  startTurnTimer() {
    this.clearTurnTimer();
    this.timerDeadline = Date.now() + this.timerSeconds * 1000;
    this.turnTimer = setTimeout(() => {
      if (this.status !== "IN_PROGRESS") return;
      const color = this.turn;
      this.playRandomLegalMove();
      if (this.onTimeout) this.onTimeout(color);
    }, this.timerSeconds * 1000);
  }

  clearTurnTimer() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.turnTimer = null;
  }

  // ---------------- Chess moves ----------------
  isSquareFrozen(square: string, color: PlayerColor): boolean {
    return this.effects.frozenSquares[color] === square;
  }

  isSquareShielded(square: string): boolean {
    return this.effects.shieldedSquares.includes(square);
  }

  /** Attempts a chess move. Returns { ok, san, captured, error } */
  makeMove(playerId: string, from: string, to: string, promotion?: string) {
    const color = this.colorOf(playerId);
    if (!color) return { ok: false, error: "Not a player in this room" };
    if (this.status !== "IN_PROGRESS") return { ok: false, error: "Game not in progress" };
    if (this.turn !== color) return { ok: false, error: "Not your turn" };
    if (this.isSquareFrozen(from, color)) {
      return { ok: false, error: "This piece is frozen and cannot move" };
    }

    const targetPiece = this.chess.get(to as any);
    if (targetPiece && this.isSquareShielded(to)) {
      return { ok: false, error: "Target piece is shielded from capture" };
    }

    let move;
    try {
      move = this.chess.move({ from, to, promotion: promotion || "q" });
    } catch (e) {
      move = null;
    }
    if (!move) return { ok: false, error: "Illegal move" };

    if (move.captured) {
      const capturingColor = color;
      this.captured[capturingColor].push(move.captured);
    }

    // Clear frozen marker for the square that just moved (it's stale now)
    if (this.effects.frozenSquares[color] === from) {
      this.effects.frozenSquares[color] = null;
    }
    // Shield expires once its owner's next turn starts (handled in advanceTurn)

    this.lastEvent = { type: "MOVE", payload: { from, to, san: move.san, by: color } };

    const gameOverInfo = this.checkGameOver();
    if (gameOverInfo) {
      return { ok: true, san: move.san, captured: move.captured, gameOver: gameOverInfo };
    }

    // Handle extra move stacking (Double Move card, or dice extra turn)
    if (this.effects.extraMovesRemaining[color] > 0) {
      this.effects.extraMovesRemaining[color] -= 1;
      this.startTurnTimer();
      return { ok: true, san: move.san, captured: move.captured, extraMove: true };
    }

    this.advanceTurn();
    return { ok: true, san: move.san, captured: move.captured };
  }

  playRandomLegalMove() {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) {
      this.checkGameOver();
      return;
    }
    const legal = moves.filter((m) => !this.isSquareFrozen(m.from, this.turn));
    const pool = legal.length > 0 ? legal : moves;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const move = this.chess.move({ from: chosen.from, to: chosen.to, promotion: "q" });
    if (move?.captured) this.captured[this.turn === "w" ? "b" : "w"].push(move.captured);
    this.lastEvent = { type: "TIMEOUT_AUTO_MOVE", payload: { san: move?.san } };
    const over = this.checkGameOver();
    if (!over) this.advanceTurn();
  }

  checkGameOver(): { winner: PlayerColor | null; reason: string } | null {
    if (this.chess.isCheckmate()) {
      const winner: PlayerColor = this.turn === "w" ? "b" : "w";
      this.endGame(winner, "checkmate");
      return { winner, reason: "checkmate" };
    }
    if (this.chess.isStalemate()) {
      this.endGame(null, "stalemate");
      return { winner: null, reason: "stalemate" };
    }
    if (this.chess.isDraw()) {
      this.endGame(null, "draw");
      return { winner: null, reason: "draw" };
    }
    return null;
  }

  endGame(winner: PlayerColor | null, reason: string) {
    this.status = "FINISHED";
    this.winner = winner;
    this.winReason = reason;
    this.clearTurnTimer();
  }

  resignOrDisconnectWin(remainingColor: PlayerColor, reason: string) {
    this.endGame(remainingColor, reason);
  }

  // ---------------- Turn advancement + chaos ----------------
  advanceTurn() {
    // Expire shields belonging to the player whose turn is starting
    const upcoming = this.turn; // chess.js already flipped turn internally after move()
    this.effects.shieldedSquares = this.effects.shieldedSquares.filter((sq) => {
      const piece = this.chess.get(sq as any);
      return piece && piece.color !== upcoming;
    });

    // Handle skip-next-turn
    if (this.effects.skipNextTurn[upcoming]) {
      this.effects.skipNextTurn[upcoming] = false;
      // Force flip turn back by making a null-move style skip: we simulate by
      // temporarily swapping the side to move in the FEN.
      this.skipTurnFor(upcoming);
    }

    this.turnNumber += 1;
    this.chaosCounter += 1;

    if (this.chaosCounter >= this.nextChaosIn) {
      this.chaosCounter = 0;
      this.nextChaosIn = rollNextChaosInterval();
      this.triggerChaosEvent();
    }

    this.startTurnTimer();
  }

  private skipTurnFor(color: PlayerColor) {
    // chess.js doesn't support a "pass" move natively, so we edit the FEN's
    // active-color field directly to flip the turn back to the opponent.
    const fenParts = this.chess.fen().split(" ");
    fenParts[1] = color === "w" ? "b" : "w";
    this.chess.load(fenParts.join(" "));
    this.lastEvent = { type: "TURN_SKIPPED", payload: { color } };
  }

  // ---------------- Cards ----------------
  playCard(
    playerId: string,
    card: CardKey,
    targetSquare?: string,
    targetSquare2?: string
  ): { ok: boolean; error?: string } {
    const color = this.colorOf(playerId);
    if (!color) return { ok: false, error: "Not a player in this room" };
    if (this.status !== "IN_PROGRESS") return { ok: false, error: "Game not in progress" };
    if (this.turn !== color) return { ok: false, error: "You can only play cards on your turn" };

    const hand = this.hands[color];
    const idx = hand.indexOf(card);
    if (idx === -1) return { ok: false, error: "Card not in hand" };

    const opponent: PlayerColor = color === "w" ? "b" : "w";

    switch (card) {
      case "SKIP": {
        this.effects.skipNextTurn[opponent] = true;
        break;
      }
      case "DRAW_TWO": {
        this.hands[opponent].push(...drawRandomCards(2));
        this.deckCount -= 2;
        break;
      }
      case "SWAP_PIECES": {
        if (!targetSquare || !targetSquare2) {
          return { ok: false, error: "Swap Pieces requires two target squares" };
        }
        const p1 = this.chess.get(targetSquare as any);
        const p2 = this.chess.get(targetSquare2 as any);
        if (!p1 || !p2 || p1.color !== color || p2.color !== color) {
          return { ok: false, error: "Both squares must contain your own pieces" };
        }
        this.swapSquares(targetSquare, targetSquare2);
        break;
      }
      case "FREEZE_PIECE": {
        if (!targetSquare) return { ok: false, error: "Freeze Piece requires a target square" };
        const piece = this.chess.get(targetSquare as any);
        if (!piece || piece.color !== opponent) {
          return { ok: false, error: "Target must be an opponent piece" };
        }
        this.effects.frozenSquares[opponent] = targetSquare;
        break;
      }
      case "DOUBLE_MOVE": {
        this.effects.extraMovesRemaining[color] += 1;
        break;
      }
      case "SHIELD": {
        if (!targetSquare) return { ok: false, error: "Shield requires a target square" };
        const piece = this.chess.get(targetSquare as any);
        if (!piece || piece.color !== color) {
          return { ok: false, error: "Target must be your own piece" };
        }
        this.effects.shieldedSquares.push(targetSquare);
        break;
      }
      default:
        return { ok: false, error: "Unknown card" };
    }

    hand.splice(idx, 1);
    this.lastEvent = { type: "CARD_PLAYED", payload: { card, by: color, targetSquare, targetSquare2 } };
    return { ok: true };
  }

  private swapSquares(a: string, b: string) {
    const fenBoard = this.chess.board();
    const pa = this.chess.get(a as any);
    const pb = this.chess.get(b as any);
    this.chess.remove(a as any);
    this.chess.remove(b as any);
    if (pa) this.chess.put({ type: pa.type, color: pa.color }, b as any);
    if (pb) this.chess.put({ type: pb.type, color: pb.color }, a as any);
  }

  // ---------------- Dice ----------------
  rollDiceFor(playerId: string): { ok: boolean; error?: string; outcome?: DiceOutcomeKey } {
    const color = this.colorOf(playerId);
    if (!color) return { ok: false, error: "Not a player in this room" };
    if (this.status !== "IN_PROGRESS") return { ok: false, error: "Game not in progress" };
    if (this.turn !== color) return { ok: false, error: "You can only roll on your turn" };

    const outcome = rollDice();
    const opponent: PlayerColor = color === "w" ? "b" : "w";

    switch (outcome) {
      case "EXTRA_TURN":
        this.effects.extraMovesRemaining[color] += 1;
        break;
      case "REVIVE_PIECE": {
        const list = this.captured[color];
        if (list.length > 0) {
          const pieceType = list.pop()!;
          const empty = this.randomEmptySquare();
          if (empty) this.chess.put({ type: pieceType as any, color }, empty as any);
        }
        break;
      }
      case "RANDOM_TELEPORT": {
        const squares = this.chess.board().flat().filter((s) => s && s.color === color);
        if (squares.length > 0) {
          const piece = squares[Math.floor(Math.random() * squares.length)]!;
          const from = piece.square;
          const empty = this.randomEmptySquare();
          if (empty) {
            this.chess.remove(from as any);
            this.chess.put({ type: piece.type, color: piece.color }, empty as any);
          }
        }
        break;
      }
      case "LOSE_NEXT_TURN":
        this.effects.skipNextTurn[color] = true;
        break;
      case "BONUS_CARD":
        this.hands[color].push(...drawRandomCards(1));
        this.deckCount -= 1;
        break;
      case "SHIELD_RANDOM": {
        const squares = this.chess.board().flat().filter((s) => s && s.color === color);
        if (squares.length > 0) {
          const piece = squares[Math.floor(Math.random() * squares.length)]!;
          this.effects.shieldedSquares.push(piece.square);
        }
        break;
      }
    }

    this.lastEvent = { type: "DICE_ROLLED", payload: { outcome, by: color } };
    return { ok: true, outcome };
  }

  private randomEmptySquare(): string | null {
    const files = "abcdefgh";
    const empties: string[] = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const sq = `${files[f]}${r}`;
        if (!this.chess.get(sq as any)) empties.push(sq);
      }
    }
    if (empties.length === 0) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  // ---------------- Chaos ----------------
  triggerChaosEvent() {
    const key = pickRandomChaosEvent();
    this.applyChaosEvent(key);
    this.lastEvent = { type: "CHAOS_EVENT", payload: { key } };
  }

  private applyChaosEvent(key: ChaosEventKey) {
    switch (key) {
      case "BOARD_ROTATE":
        this.effects.boardRotated = !this.effects.boardRotated;
        break;
      case "PIECE_SWAP": {
        const occupied = this.chess
          .board()
          .flat()
          .filter((s) => s !== null) as { square: string }[];
        if (occupied.length >= 2) {
          const shuffled = [...occupied].sort(() => Math.random() - 0.5);
          const [a, b] = shuffled;
          const pa = this.chess.get(a.square as any);
          const pb = this.chess.get(b.square as any);
          // Never swap kings to avoid instant illegal-position edge cases
          if (pa?.type !== "k" && pb?.type !== "k") {
            this.swapSquares(a.square, b.square);
          }
        }
        break;
      }
      case "FOG_OF_WAR":
        this.effects.fogOfWarUntilTurn = this.turnNumber + 3;
        break;
      case "RANDOM_EXPLOSION": {
        const nonKings = this.chess
          .board()
          .flat()
          .filter((s) => s && s.type !== "k") as { square: string; color: PlayerColor }[];
        if (nonKings.length > 0) {
          const target = nonKings[Math.floor(Math.random() * nonKings.length)];
          if (!this.isSquareShielded(target.square)) {
            this.chess.remove(target.square as any);
          }
        }
        break;
      }
      case "TIME_FREEZE":
        this.timerSeconds = this.timerSeconds * 2;
        this.startTurnTimer();
        break;
      case "EVERYONE_DRAWS":
        this.hands.w.push(...drawRandomCards(1));
        this.hands.b.push(...drawRandomCards(1));
        this.deckCount -= 2;
        break;
    }
  }

  // ---------------- Snapshot ----------------
  getSnapshot(): GameStateSnapshot {
    return {
      roomCode: this.roomCode,
      fen: this.chess.fen(),
      turn: this.turn,
      turnNumber: this.turnNumber,
      players: [this.players.w, this.players.b].filter(Boolean) as PlayerInfo[],
      hands: this.hands,
      deckCount: this.deckCount,
      captured: this.captured,
      effects: this.effects,
      timerSeconds: this.timerSeconds,
      timerDeadline: this.timerDeadline,
      status: this.status,
      winner: this.winner,
      winReason: this.winReason,
      lastEvent: this.lastEvent,
      chaosCounter: this.chaosCounter,
      nextChaosIn: this.nextChaosIn,
    };
  }
}
