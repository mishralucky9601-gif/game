"use client";

import { useEffect, useState } from "react";

export default function TurnTimer({
  deadline,
  totalSeconds,
  active,
}: {
  deadline: number | null;
  totalSeconds: number;
  active: boolean;
}) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const ms = deadline - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  const pct = Math.max(0, Math.min(1, remaining / totalSeconds));
  const low = remaining <= 10;

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-10 w-10 shrink-0">
        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={low ? "#ef4444" : "#8b5cf6"}
            strokeWidth="3"
            strokeDasharray={2 * Math.PI * 15.5}
            strokeDashoffset={2 * Math.PI * 15.5 * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.25s linear" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {active ? remaining : "-"}
        </span>
      </div>
    </div>
  );
}
