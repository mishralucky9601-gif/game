import { create } from "zustand";
import { GameStateSnapshot, PlayerColor } from "@/lib/types";

interface Toast {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
}

interface GameStore {
  state: GameStateSnapshot | null;
  myColor: PlayerColor | null;
  soundOn: boolean;
  toasts: Toast[];
  chatMessages: { from: string; text: string; at: number }[];
  boardShake: boolean;

  setState: (s: GameStateSnapshot) => void;
  setMyColor: (c: PlayerColor) => void;
  toggleSound: () => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  addChatMessage: (m: { from: string; text: string; at: number }) => void;
  triggerBoardShake: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  myColor: null,
  soundOn: true,
  toasts: [],
  chatMessages: [],
  boardShake: false,

  setState: (s) => set({ state: s }),
  setMyColor: (c) => set({ myColor: c }),
  toggleSound: () => set({ soundOn: !get().soundOn }),

  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  addChatMessage: (m) => set({ chatMessages: [...get().chatMessages, m] }),

  triggerBoardShake: () => {
    set({ boardShake: true });
    setTimeout(() => set({ boardShake: false }), 450);
  },

  reset: () => set({ state: null, myColor: null, toasts: [], chatMessages: [] }),
}));
