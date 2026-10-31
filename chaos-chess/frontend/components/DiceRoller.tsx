"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function DiceRoller({
  canRoll,
  onRoll,
}: {
  canRoll: boolean;
  onRoll: () => void;
}) {
  const [rolling, setRolling] = useState(false);

  function handleClick() {
    if (!canRoll || rolling) return;
    setRolling(true);
    onRoll();
    setTimeout(() => setRolling(false), 600);
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={!canRoll || rolling}
      whileTap={{ scale: 0.9 }}
      className="glass flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-glass disabled:opacity-40"
      title="Roll dice"
    >
      <motion.span
        animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1, 1.2, 1] } : {}}
        transition={{ duration: 0.6 }}
      >
        🎲
      </motion.span>
    </motion.button>
  );
}
