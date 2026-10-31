"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, guestLogin, saveSession } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useGameStore } from "@/store/gameStore";
import GameBoard from "@/components/GameBoard";
import PlayerPanel from "@/components/PlayerPanel";
import CardHand, { NEEDS_ONE_TARGET, NEEDS_TWO_TARGETS } from "@/components/CardHand";
import DiceRoller from "@/components/DiceRoller";
import ToastStack from "@/components/ToastStack";
import GlassButton from "@/components/GlassButton";
import ParticleBackground from "@/components/ParticleBackground";
import { CardKey, PlayerColor } from "@/lib/types";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const [token, setToken] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [pendingCard, setPendingCard] = useState<CardKey | null>(null);
  const [firstTarget, setFirstTarget] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [showChat, setShowChat] = useState(false);

  const socketRef = useSocket(token);
  const { state, myColor, setMyColor, chatMessages, boardShake } = useGameStore();

  // Bootstrap session + join the room.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let session = getSession();
      if (!session) {
        const created = await guestLogin();
        saveSession(created.token, created.playerId, created.username);
        session = getSession();
      }
      if (!session || cancelled) return;
      setToken(session.token);
      setMyPlayerId(session.playerId);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !roomCode) return;
    const socket = socketRef.current;
    if (!socket) return;

    const tryJoin = () => {
      socket.emit("join_room", { roomCode }, (res: any) => {
        if (!res?.ok) {
          alert(res?.error || "Could not join room");
          router.push("/");
          return;
        }
        setMyColor(res.color as PlayerColor);
      });
    };

    if (socket.connected) tryJoin();
    socket.on("connect", tryJoin);
    return () => {
      socket.off("connect", tryJoin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roomCode, socketRef.current]);

  const myHand = useMemo(() => (myColor && state ? state.hands[myColor] : []), [myColor, state]);
  const isMyTurn = !!(state && myColor && state.turn === myColor && state.status === "IN_PROGRESS");

  function handleDrop(from: string, to: string): boolean {
    const socket = socketRef.current;
    if (!socket || !isMyTurn) return false;
    socket.emit("move_piece", { from, to, promotion: "q" }, (res: any) => {
      if (!res?.ok) {
        useGameStore.getState().pushToast({ emoji: "🚫", title: res?.error || "Illegal move" });
      }
    });
    return true; // optimistic; state_sync will correct the board if rejected
  }

  function handleSelectCard(card: CardKey) {
    if (!isMyTurn) return;
    if (pendingCard === card) {
      setPendingCard(null);
      setFirstTarget(null);
      return;
    }
    setPendingCard(card);
    setFirstTarget(null);
    if (!NEEDS_ONE_TARGET.includes(card) && !NEEDS_TWO_TARGETS.includes(card)) {
      playCard(card);
    }
  }

  function playCard(card: CardKey, targetSquare?: string, targetSquare2?: string) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("play_card", { card, targetSquare, targetSquare2 }, (res: any) => {
      if (!res?.ok) {
        useGameStore.getState().pushToast({ emoji: "🚫", title: res?.error || "Card failed" });
      }
    });
    setPendingCard(null);
    setFirstTarget(null);
  }

  function handleSquareClick(square: string) {
    if (!pendingCard) return;
    if (NEEDS_ONE_TARGET.includes(pendingCard)) {
      playCard(pendingCard, square);
    } else if (NEEDS_TWO_TARGETS.includes(pendingCard)) {
      if (!firstTarget) {
        setFirstTarget(square);
      } else {
        playCard(pendingCard, firstTarget, square);
      }
    }
  }

  function handleRoll() {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("roll_dice", {}, (res: any) => {
      if (!res?.ok) useGameStore.getState().pushToast({ emoji: "🚫", title: res?.error || "Cannot roll" });
    });
  }

  function handleResign() {
    if (!confirm("Resign this match?")) return;
    socketRef.current?.emit("resign", {});
  }

  function sendChat() {
    if (!chatText.trim()) return;
    socketRef.current?.emit("chat_message", { text: chatText.trim() });
    setChatText("");
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    useGameStore.getState().pushToast({ emoji: "🔗", title: "Invite link copied!" });
  }

  if (!state) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <ParticleBackground />
        <div className="glass relative z-10 rounded-2xl px-8 py-6 text-center shadow-glass">
          <p className="text-lg font-bold">Connecting to room {roomCode}…</p>
          <p className="mt-2 text-sm text-white/50">Share the room code so a friend can join.</p>
        </div>
      </main>
    );
  }

  const whitePlayer = state.players.find((p) => p.color === "w");
  const blackPlayer = state.players.find((p) => p.color === "b");
  const waiting = state.status === "WAITING";

  return (
    <main className="relative min-h-screen px-3 py-4 pb-40">
      <ParticleBackground />
      <ToastStack />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-3">
        <div className="glass flex items-center justify-between rounded-2xl px-4 py-2 shadow-glass">
          <button onClick={() => router.push("/")} className="text-sm text-white/60 hover:text-white">
            ← Home
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-white/40">Room</p>
            <p className="text-lg font-black tracking-widest">{roomCode}</p>
          </div>
          <GlassButton onClick={copyInviteLink} className="!px-3 !py-1.5 text-xs">
            🔗 Invite
          </GlassButton>
        </div>

        {waiting && (
          <div className="glass rounded-2xl px-4 py-6 text-center shadow-glass">
            <p className="text-lg font-bold">Waiting for opponent to join…</p>
            <p className="mt-1 text-sm text-white/50">Send them the room code or the invite link above.</p>
          </div>
        )}

        <PlayerPanel
          player={blackPlayer}
          color="b"
          isTurn={state.turn === "b" && state.status === "IN_PROGRESS"}
          isMe={myColor === "b"}
          captured={state.captured.b}
          timerDeadline={state.timerDeadline}
          timerSeconds={state.timerSeconds}
        />

        <div className="flex justify-center">
          <GameBoard
            fen={state.fen}
            orientation={myColor || "w"}
            boardRotated={state.effects.boardRotated}
            myTurn={isMyTurn}
            effects={state.effects}
            pendingCardTargeting={!!pendingCard}
            onDrop={handleDrop}
            onSquareClick={handleSquareClick}
            shake={boardShake}
          />
        </div>

        <PlayerPanel
          player={whitePlayer}
          color="w"
          isTurn={state.turn === "w" && state.status === "IN_PROGRESS"}
          isMe={myColor === "w"}
          captured={state.captured.w}
          timerDeadline={state.timerDeadline}
          timerSeconds={state.timerSeconds}
        />

        <div className="flex items-center gap-3">
          <DiceRoller canRoll={isMyTurn} onRoll={handleRoll} />
          <div className="flex-1">
            <CardHand
              hand={myHand}
              canPlay={isMyTurn}
              pendingCard={pendingCard}
              onSelectCard={handleSelectCard}
              onCancel={() => {
                setPendingCard(null);
                setFirstTarget(null);
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/40">
          <span>
            Chaos in {Math.max(0, state.nextChaosIn - state.chaosCounter)} turn
            {state.nextChaosIn - state.chaosCounter === 1 ? "" : "s"} · Deck: {state.deckCount} cards
          </span>
          <div className="flex gap-2">
            <button onClick={() => setShowChat((s) => !s)} className="hover:text-white">
              💬 Chat
            </button>
            <button onClick={handleResign} className="text-chaos-danger hover:underline">
              Resign
            </button>
          </div>
        </div>

        {showChat && (
          <div className="glass flex flex-col gap-2 rounded-2xl p-3 shadow-glass">
            <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {chatMessages.length === 0 && <p className="text-white/40">No messages yet.</p>}
              {chatMessages.map((m, i) => (
                <p key={i}>
                  <span className="font-bold text-chaos-accent2">{m.from}:</span> {m.text}
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Say something…"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-chaos-accent"
              />
              <GlassButton onClick={sendChat} className="!px-4 !py-2 text-sm">
                Send
              </GlassButton>
            </div>
          </div>
        )}

        {state.status === "FINISHED" && (
          <div className="glass rounded-2xl px-4 py-6 text-center shadow-glass">
            <p className="text-2xl font-black glow-text">
              {state.winner
                ? `${state.winner === myColor ? "You win! 🏆" : "You lose"} (${state.winReason})`
                : `Draw (${state.winReason})`}
            </p>
            <GlassButton variant="primary" className="mt-4" onClick={() => router.push("/")}>
              Back to Home
            </GlassButton>
          </div>
        )}
      </div>
    </main>
  );
}
