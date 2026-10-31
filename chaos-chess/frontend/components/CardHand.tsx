"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CARD_INFO, CardKey } from "@/lib/types";

const NEEDS_ONE_TARGET: CardKey[] = ["FREEZE_PIECE", "SHIELD"];
const NEEDS_TWO_TARGETS: CardKey[] = ["SWAP_PIECES"];

export default function CardHand({
  hand,
  canPlay,
  pendingCard,
  onSelectCard,
  onCancel,
}: {
  hand: CardKey[];
  canPlay: boolean;
  pendingCard: CardKey | null;
  onSelectCard: (card: CardKey) => void;
  onCancel: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-3 shadow-glass">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-white/50">Your Cards</p>
        {pendingCard && (
          <button onClick={onCancel} className="text-xs text-chaos-danger hover:underline">
            Cancel targeting
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <AnimatePresence initial={false}>
          {hand.length === 0 && <p className="text-xs text-white/40">No cards in hand.</p>}
          {hand.map((card, idx) => {
            const info = CARD_INFO[card];
            const active = pendingCard === card;
            return (
              <motion.button
                key={`${card}-${idx}`}
                layout
                initial={{ opacity: 0, y: 20, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -30, rotate: 12, scale: 0.7 }}
                whileHover={{ y: -6 }}
                disabled={!canPlay}
                onClick={() => onSelectCard(card)}
                className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors ${
                  active
                    ? "border-chaos-gold bg-chaos-gold/10"
                    : "border-white/10 bg-black/30 hover:border-chaos-accent"
                } ${!canPlay ? "opacity-40" : ""}`}
              >
                <span className="text-2xl">{info.emoji}</span>
                <span className="text-[11px] font-bold leading-tight">{info.name}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      {pendingCard && (
        <p className="mt-2 text-xs text-chaos-gold">
          {NEEDS_TWO_TARGETS.includes(pendingCard)
            ? "Tap two of your own pieces on the board to swap them."
            : NEEDS_ONE_TARGET.includes(pendingCard)
            ? pendingCard === "SHIELD"
              ? "Tap one of your own pieces to shield it."
              : "Tap an opponent piece to freeze it."
            : "Tap Confirm to play this card."}
        </p>
      )}
    </div>
  );
}

export { NEEDS_ONE_TARGET, NEEDS_TWO_TARGETS };
