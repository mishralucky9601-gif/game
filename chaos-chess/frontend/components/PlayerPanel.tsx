"use client";

import { PlayerColor, PlayerInfo } from "@/lib/types";
import TurnTimer from "@/components/TurnTimer";

const PIECE_GLYPH: Record<string, string> = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
};

export default function PlayerPanel({
  player,
  color,
  isTurn,
  isMe,
  captured,
  timerDeadline,
  timerSeconds,
}: {
  player: PlayerInfo | undefined;
  color: PlayerColor;
  isTurn: boolean;
  isMe: boolean;
  captured: string[];
  timerDeadline: number | null;
  timerSeconds: number;
}) {
  return (
    <div
      className={`glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-glass transition-all ${
        isTurn ? "ring-2 ring-chaos-accent" : "opacity-80"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
            color === "w" ? "bg-white text-black" : "bg-black text-white border border-white/30"
          }`}
        >
          {color === "w" ? "♔" : "♚"}
        </div>
        <div>
          <p className="text-sm font-bold">
            {player?.username || "Waiting…"} {isMe && <span className="text-chaos-accent2">(You)</span>}
          </p>
          <p className="text-xs text-white/50">
            {player ? (player.connected ? "Connected" : "Reconnecting…") : "Empty seat"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex max-w-[110px] flex-wrap gap-0.5 text-lg leading-none text-chaos-gold">
          {captured.map((p, i) => (
            <span key={i}>{PIECE_GLYPH[p] || "?"}</span>
          ))}
        </div>
        <TurnTimer deadline={isTurn ? timerDeadline : null} totalSeconds={timerSeconds} active={isTurn} />
      </div>
    </div>
  );
}
