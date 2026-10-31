"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";

export default function ToastStack() {
  const { toasts, dismissToast } = useGameStore();

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-glass"
            onClick={() => dismissToast(t.id)}
          >
            <span className="text-2xl">{t.emoji}</span>
            <div>
              <p className="text-sm font-bold leading-tight">{t.title}</p>
              {t.subtitle && <p className="text-xs text-white/60">{t.subtitle}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
