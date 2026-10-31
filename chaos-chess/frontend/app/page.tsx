"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GlassButton from "@/components/GlassButton";
import Modal from "@/components/Modal";
import ParticleBackground from "@/components/ParticleBackground";
import { getSession, guestLogin, saveSession } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { CARD_INFO, CHAOS_INFO, DICE_INFO } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) setUsername(session.username);
    const soundPref = typeof window !== "undefined" ? localStorage.getItem("chaos_sound") : null;
    setSoundOn(soundPref !== "off");
    setReady(true);
  }, []);

  async function ensureSession(): Promise<string> {
    const existing = getSession();
    if (existing) return existing.token;
    const created = await guestLogin(username || undefined);
    saveSession(created.token, created.playerId, created.username);
    return created.token;
  }

  async function handleCreateRoom() {
    setError(null);
    setLoading("create");
    try {
      const token = await ensureSession();
      const socket = getSocket(token);
      socket.emit("create_room", { turnSeconds: 60 }, (res: any) => {
        setLoading(null);
        if (!res?.ok) return setError(res?.error || "Could not create room");
        router.push(`/room/${res.roomCode}`);
      });
    } catch (e: any) {
      setLoading(null);
      setError(e.message || "Something went wrong");
    }
  }

  async function handleJoinRoom() {
    if (!joinCode.trim()) return setError("Enter a room code first");
    setError(null);
    setLoading("join");
    try {
      const token = await ensureSession();
      const socket = getSocket(token);
      socket.emit("join_room", { roomCode: joinCode.trim().toUpperCase() }, (res: any) => {
        setLoading(null);
        if (!res?.ok) return setError(res?.error || "Could not join room");
        router.push(`/room/${res.roomCode}`);
      });
    } catch (e: any) {
      setLoading(null);
      setError(e.message || "Something went wrong");
    }
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("chaos_sound", next ? "on" : "off");
  }

  if (!ready) return null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <ParticleBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tight glow-text">
            ♟️ Chaos <span className="text-chaos-accent2">Chess</span>
          </h1>
          <p className="mt-2 text-white/60">Chess + Cards + Dice + Pure Chaos</p>
        </div>

        <div className="glass mb-4 rounded-2xl p-4 shadow-glass">
          <label className="mb-1 block text-xs uppercase tracking-wider text-white/50">
            Your name
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Guest1234"
            maxLength={20}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 outline-none focus:border-chaos-accent"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-chaos-danger/40 bg-chaos-danger/10 px-4 py-2 text-sm text-chaos-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <GlassButton variant="primary" onClick={handleCreateRoom} disabled={loading !== null}>
            {loading === "create" ? "Creating…" : "🎮 Create Room"}
          </GlassButton>

          <div className="glass flex items-center gap-2 rounded-2xl p-2 shadow-glass">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 rounded-xl bg-transparent px-3 py-2 tracking-widest outline-none placeholder:text-white/30"
            />
            <GlassButton onClick={handleJoinRoom} disabled={loading !== null}>
              {loading === "join" ? "Joining…" : "Join"}
            </GlassButton>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <GlassButton onClick={() => setShowHowTo(true)} className="text-sm">
              📖 How To Play
            </GlassButton>
            <GlassButton onClick={() => setShowSettings(true)} className="text-sm">
              ⚙️ Settings
            </GlassButton>
            <GlassButton onClick={() => setShowLeaderboard(true)} className="text-sm">
              🏆 Leaderboard
            </GlassButton>
          </div>
        </div>
      </div>

      <Modal open={showHowTo} onClose={() => setShowHowTo(false)} title="How To Play">
        <div className="space-y-4 text-sm text-white/80">
          <p>
            Chaos Chess plays like normal chess — take turns moving pieces, capture the
            opponent&apos;s king by checkmate to win. But every turn you can also throw in a
            twist:
          </p>
          <div>
            <h3 className="mb-2 font-bold text-chaos-accent">🎴 Cards (play on your turn)</h3>
            <ul className="space-y-1">
              {Object.values(CARD_INFO).map((c) => (
                <li key={c.name}>
                  {c.emoji} <b>{c.name}</b> — {c.description}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-bold text-chaos-accent">🎲 Dice (roll once per turn)</h3>
            <ul className="space-y-1">
              {Object.values(DICE_INFO).map((d) => (
                <li key={d.label}>
                  {d.emoji} {d.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-bold text-chaos-accent">🌪️ Chaos Events (automatic, every 2-4 turns)</h3>
            <ul className="space-y-1">
              {Object.values(CHAOS_INFO).map((c) => (
                <li key={c.name}>
                  {c.emoji} <b>{c.name}</b> — {c.description}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-white/50">
            If your timer runs out, a random legal move is played for you automatically.
          </p>
        </div>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <span>Sound Effects</span>
          <GlassButton onClick={toggleSound} variant={soundOn ? "primary" : "default"}>
            {soundOn ? "On 🔊" : "Off 🔇"}
          </GlassButton>
        </div>
      </Modal>

      <Modal open={showLeaderboard} onClose={() => setShowLeaderboard(false)} title="Leaderboard">
        <div className="space-y-2 text-sm text-white/70">
          <p>
            Global / Daily / Weekly / Friends leaderboards are backed by the{" "}
            <code>LeaderboardEntry</code> table in the Prisma schema. Wire this modal up to a{" "}
            <code>GET /api/leaderboard?period=global</code> endpoint once matches are being
            persisted (see backend README section &quot;Extending Persistence&quot;).
          </p>
        </div>
      </Modal>
    </main>
  );
}
