const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function guestLogin(username?: string): Promise<{
  token: string;
  playerId: string;
  username: string;
}> {
  const res = await fetch(`${API_URL}/api/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error("Failed to create guest session");
  return res.json();
}

const TOKEN_KEY = "chaos_chess_token";
const PLAYER_KEY = "chaos_chess_player";

export function saveSession(token: string, playerId: string, username: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PLAYER_KEY, JSON.stringify({ playerId, username }));
}

export function getSession(): { token: string; playerId: string; username: string } | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(PLAYER_KEY);
  if (!token || !raw) return null;
  const { playerId, username } = JSON.parse(raw);
  return { token, playerId, username };
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAYER_KEY);
}
