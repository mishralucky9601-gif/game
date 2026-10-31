import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { GameEngine } from "../game/GameEngine";
import { generateRoomCode } from "../utils/roomCode";
import { CardKey } from "../game/types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

interface AuthedSocket extends Socket {
  playerId?: string;
  username?: string;
  roomCode?: string;
}

// In-memory room registry. For production scale this would move to Redis,
// but for a 2-player-per-room game this is simple, fast, and sufficient.
const rooms = new Map<string, GameEngine>();

// Basic per-socket rate limiting to blunt spam/cheating attempts.
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_EVENTS = 15;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(socketId);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_EVENTS;
}

function authenticate(token: string | undefined): { playerId: string; username: string } | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string; username: string };
    return { playerId: decoded.playerId, username: decoded.username };
  } catch {
    return null;
  }
}

export function registerSocketHandlers(io: Server) {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const identity = authenticate(token);
    if (!identity) return next(new Error("Unauthorized: invalid or missing token"));
    socket.playerId = identity.playerId;
    socket.username = identity.username;
    next();
  });

  io.on("connection", (socket: AuthedSocket) => {
    socket.onAny(() => {
      if (isRateLimited(socket.id)) {
        socket.emit("error_message", "Too many actions — slow down.");
      }
    });

    socket.on("create_room", (payload: { turnSeconds?: number }, ack) => {
      const code = generateRoomCode();
      const engine = new GameEngine(code, payload?.turnSeconds ?? 60);
      rooms.set(code, engine);
      const color = engine.addPlayer(socket.playerId!, socket.username!);
      socket.join(code);
      socket.roomCode = code;
      ack?.({ ok: true, roomCode: code, color });
    });

    socket.on("join_room", (payload: { roomCode: string }, ack) => {
      const code = (payload?.roomCode || "").toUpperCase().trim();
      const engine = rooms.get(code);
      if (!engine) return ack?.({ ok: false, error: "Room not found" });

      const color = engine.addPlayer(socket.playerId!, socket.username!);
      if (!color) return ack?.({ ok: false, error: "Room is full" });

      socket.join(code);
      socket.roomCode = code;
      engine.setConnected(color, true);

      ack?.({ ok: true, roomCode: code, color });
      io.to(code).emit("state_sync", engine.getSnapshot());

      if (engine.bothPlayersPresent() && engine.status === "WAITING") {
        engine.onTimeout = (timedOutColor) => {
          io.to(code).emit("state_sync", engine.getSnapshot());
          io.to(code).emit("turn_timeout", { color: timedOutColor });
        };
        engine.start();
        io.to(code).emit("game_start", engine.getSnapshot());
      }
    });

    socket.on(
      "move_piece",
      (payload: { from: string; to: string; promotion?: string }, ack) => {
        const engine = getEngine(socket);
        if (!engine) return ack?.({ ok: false, error: "Not in a room" });

        const result = engine.makeMove(socket.playerId!, payload.from, payload.to, payload.promotion);
        if (!result.ok) return ack?.({ ok: false, error: result.error });

        ack?.({ ok: true });
        io.to(socket.roomCode!).emit("move_made", {
          from: payload.from,
          to: payload.to,
          san: result.san,
          captured: result.captured,
          extraMove: (result as any).extraMove || false,
        });
        io.to(socket.roomCode!).emit("state_sync", engine.getSnapshot());

        if ((result as any).gameOver) {
          io.to(socket.roomCode!).emit("game_over", engine.getSnapshot());
        }
      }
    );

    socket.on(
      "play_card",
      (payload: { card: CardKey; targetSquare?: string; targetSquare2?: string }, ack) => {
        const engine = getEngine(socket);
        if (!engine) return ack?.({ ok: false, error: "Not in a room" });

        const result = engine.playCard(
          socket.playerId!,
          payload.card,
          payload.targetSquare,
          payload.targetSquare2
        );
        if (!result.ok) return ack?.({ ok: false, error: result.error });

        ack?.({ ok: true });
        io.to(socket.roomCode!).emit("card_played", { by: engine.colorOf(socket.playerId!), ...payload });
        io.to(socket.roomCode!).emit("state_sync", engine.getSnapshot());
      }
    );

    socket.on("roll_dice", (_payload, ack) => {
      const engine = getEngine(socket);
      if (!engine) return ack?.({ ok: false, error: "Not in a room" });

      const result = engine.rollDiceFor(socket.playerId!);
      if (!result.ok) return ack?.({ ok: false, error: result.error });

      ack?.({ ok: true, outcome: result.outcome });
      io.to(socket.roomCode!).emit("dice_rolled", {
        by: engine.colorOf(socket.playerId!),
        outcome: result.outcome,
      });
      io.to(socket.roomCode!).emit("state_sync", engine.getSnapshot());
    });

    socket.on("resign", (_payload, ack) => {
      const engine = getEngine(socket);
      if (!engine) return ack?.({ ok: false, error: "Not in a room" });
      const color = engine.colorOf(socket.playerId!);
      if (!color) return ack?.({ ok: false, error: "Not a player" });
      const winner = color === "w" ? "b" : "w";
      engine.resignOrDisconnectWin(winner, "resignation");
      ack?.({ ok: true });
      io.to(socket.roomCode!).emit("game_over", engine.getSnapshot());
    });

    socket.on("chat_message", (payload: { text: string }) => {
      const engine = getEngine(socket);
      if (!engine || !payload?.text) return;
      const text = String(payload.text).slice(0, 300);
      io.to(socket.roomCode!).emit("chat_message", {
        from: socket.username,
        text,
        at: Date.now(),
      });
    });

    socket.on("request_state", (_payload, ack) => {
      const engine = getEngine(socket);
      if (!engine) return ack?.({ ok: false, error: "Not in a room" });
      ack?.({ ok: true, state: engine.getSnapshot() });
    });

    socket.on("disconnect", () => {
      const engine = getEngine(socket);
      if (!engine || !socket.roomCode) return;
      const color = engine.colorOf(socket.playerId!);
      if (color) {
        engine.setConnected(color, false);
        io.to(socket.roomCode).emit("opponent_disconnected", { color });

        // Grace period for reconnection before declaring an abandonment win.
        setTimeout(() => {
          const stillGone = !engine.players[color]?.connected;
          if (stillGone && engine.status === "IN_PROGRESS") {
            const winner = color === "w" ? "b" : "w";
            engine.resignOrDisconnectWin(winner, "opponent disconnected");
            io.to(socket.roomCode!).emit("game_over", engine.getSnapshot());
          }
        }, 60_000);
      }
    });
  });
}

function getEngine(socket: AuthedSocket): GameEngine | null {
  if (!socket.roomCode) return null;
  return rooms.get(socket.roomCode) || null;
}

export function getRoomEngine(code: string) {
  return rooms.get(code.toUpperCase());
}
