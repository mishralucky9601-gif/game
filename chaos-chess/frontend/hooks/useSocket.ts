"use client";

import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";
import { CARD_INFO, CHAOS_INFO, DICE_INFO, GameStateSnapshot } from "@/lib/types";
import { playSound } from "@/lib/sound";

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { setState, pushToast, triggerBoardShake, addChatMessage, soundOn } = useGameStore();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socketRef.current = socket;

    const onStateSync = (s: GameStateSnapshot) => setState(s);

    const onGameStart = (s: GameStateSnapshot) => {
      setState(s);
      pushToast({ emoji: "♟️", title: "Game started!", subtitle: "White moves first." });
      if (soundOn) playSound("start");
    };

    const onMoveMade = (payload: { san?: string; captured?: string; extraMove?: boolean }) => {
      if (soundOn) playSound(payload.captured ? "capture" : "move");
    };

    const onCardPlayed = (payload: { card: keyof typeof CARD_INFO; by: string }) => {
      const info = CARD_INFO[payload.card];
      pushToast({ emoji: info.emoji, title: `${info.name} played!`, subtitle: info.description });
      if (soundOn) playSound("card");
    };

    const onDiceRolled = (payload: { outcome: keyof typeof DICE_INFO; by: string }) => {
      const info = DICE_INFO[payload.outcome];
      pushToast({ emoji: info.emoji, title: info.label });
      if (soundOn) playSound("dice");
    };

    const onChaos = (payload: { key: keyof typeof CHAOS_INFO }) => {
      const info = CHAOS_INFO[payload.key];
      pushToast({ emoji: info.emoji, title: info.name, subtitle: info.description });
      triggerBoardShake();
      if (soundOn) playSound("explosion");
    };

    const onStateSyncForChaos = (s: GameStateSnapshot) => {
      if (s.lastEvent?.type === "CHAOS_EVENT") {
        onChaos({ key: s.lastEvent.payload.key });
      }
    };

    const onTurnTimeout = () => {
      pushToast({ emoji: "⏱️", title: "Time's up!", subtitle: "A random legal move was played." });
    };

    const onOpponentDisconnected = () => {
      pushToast({ emoji: "📡", title: "Opponent disconnected", subtitle: "Waiting for reconnect…" });
    };

    const onGameOver = (s: GameStateSnapshot) => {
      setState(s);
      const won = s.winner ? `${s.winner === "w" ? "White" : "Black"} wins!` : "Draw!";
      pushToast({ emoji: s.winner ? "🏆" : "🤝", title: "Game over", subtitle: `${won} (${s.winReason})` });
      if (soundOn) playSound(s.winner ? "victory" : "defeat");
    };

    const onChatMessage = (m: { from: string; text: string; at: number }) => addChatMessage(m);

    const onErrorMessage = (msg: string) => pushToast({ emoji: "⚠️", title: msg });

    socket.on("state_sync", onStateSync);
    socket.on("state_sync", onStateSyncForChaos);
    socket.on("game_start", onGameStart);
    socket.on("move_made", onMoveMade);
    socket.on("card_played", onCardPlayed);
    socket.on("dice_rolled", onDiceRolled);
    socket.on("turn_timeout", onTurnTimeout);
    socket.on("opponent_disconnected", onOpponentDisconnected);
    socket.on("game_over", onGameOver);
    socket.on("chat_message", onChatMessage);
    socket.on("error_message", onErrorMessage);

    return () => {
      socket.off("state_sync", onStateSync);
      socket.off("state_sync", onStateSyncForChaos);
      socket.off("game_start", onGameStart);
      socket.off("move_made", onMoveMade);
      socket.off("card_played", onCardPlayed);
      socket.off("dice_rolled", onDiceRolled);
      socket.off("turn_timeout", onTurnTimeout);
      socket.off("opponent_disconnected", onOpponentDisconnected);
      socket.off("game_over", onGameOver);
      socket.off("chat_message", onChatMessage);
      socket.off("error_message", onErrorMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, soundOn]);

  return socketRef;
}
