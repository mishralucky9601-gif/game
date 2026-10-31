"use client";

import { Chessboard } from "react-chessboard";
import { motion } from "framer-motion";
import { ActiveEffects, PlayerColor } from "@/lib/types";

export default function GameBoard({
  fen,
  orientation,
  boardRotated,
  myTurn,
  effects,
  pendingCardTargeting,
  onDrop,
  onSquareClick,
  shake,
}: {
  fen: string;
  orientation: PlayerColor;
  boardRotated: boolean;
  myTurn: boolean;
  effects: ActiveEffects;
  pendingCardTargeting: boolean;
  onDrop: (from: string, to: string) => boolean;
  onSquareClick: (square: string) => void;
  shake: boolean;
}) {
  const finalOrientation: "white" | "black" = boardRotated
    ? orientation === "w"
      ? "black"
      : "white"
    : orientation === "w"
    ? "white"
    : "black";

  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (effects.frozenSquares.w) {
    customSquareStyles[effects.frozenSquares.w] = {
      background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)",
    };
  }
  if (effects.frozenSquares.b) {
    customSquareStyles[effects.frozenSquares.b] = {
      background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)",
    };
  }
  for (const sq of effects.shieldedSquares) {
    customSquareStyles[sq] = {
      ...(customSquareStyles[sq] || {}),
      boxShadow: "inset 0 0 0 3px rgba(251,191,36,0.85)",
    };
  }

  return (
    <motion.div
      className={`w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/10 shadow-glass ${
        shake ? "board-shake" : ""
      } ${pendingCardTargeting ? "ring-4 ring-chaos-gold" : ""}`}
    >
      <Chessboard
        position={fen}
        boardOrientation={finalOrientation}
        arePiecesDraggable={myTurn && !pendingCardTargeting}
        onPieceDrop={(source, target) => onDrop(source, target)}
        onSquareClick={(square) => onSquareClick(square)}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={{ backgroundColor: "#3b2f63" }}
        customLightSquareStyle={{ backgroundColor: "#e8e2f7" }}
        customBoardStyle={{ borderRadius: "1rem" }}
        animationDuration={200}
      />
    </motion.div>
  );
}
