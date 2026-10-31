const { io } = require("socket.io-client");
const API = "http://localhost:4000";

async function guest(name) {
  const res = await fetch(`${API}/api/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name }),
  });
  return res.json();
}
function connect(token) {
  return io(API, { auth: { token }, reconnection: false });
}
function emit(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}
function getState(socket) {
  return new Promise((resolve) => socket.emit("request_state", {}, (r) => resolve(r.state)));
}

const OPENING_MOVES = [
  ["e2", "e4"], ["e7", "e5"],
  ["g1", "f3"], ["b8", "c6"],
  ["f1", "b5"], ["a7", "a6"],
  ["b5", "a4"], ["g8", "f6"],
  ["e1", "g1"], ["f8", "e7"],
];

(async () => {
  const p1 = await guest("Alice");
  const p2 = await guest("Bob");
  const s1 = connect(p1.token);
  const s2 = connect(p2.token);

  await new Promise((r) => s1.on("connect", r));
  await new Promise((r) => s2.on("connect", r));

  let chaosSeen = [];
  s1.on("state_sync", (s) => {
    if (s.lastEvent?.type === "CHAOS_EVENT") chaosSeen.push(s.lastEvent.payload.key);
  });

  const create = await emit(s1, "create_room", { turnSeconds: 30 });
  const roomCode = create.roomCode;
  await emit(s2, "join_room", { roomCode });
  await new Promise((r) => setTimeout(r, 200));

  // Test FREEZE_PIECE card: get white's hand, if it has one, target a black piece.
  let state = await getState(s1);
  console.log("Initial white hand:", state.hands.w);

  if (state.hands.w.includes("FREEZE_PIECE")) {
    const res = await emit(s1, "play_card", { card: "FREEZE_PIECE", targetSquare: "e7" });
    console.log("play FREEZE_PIECE on e7:", res);
    state = await getState(s1);
    console.log("frozenSquares after card:", state.effects.frozenSquares);

    // Black tries to move the frozen pawn - should fail
    const failedMove = await emit(s2, "move_piece", { from: "e7", to: "e5" });
    console.log("black tries frozen piece move (expect ok:false):", failedMove);
  } else {
    console.log("(white did not draw FREEZE_PIECE this run, skipping freeze assertion)");
  }

  // Play out a sequence of legal opening moves alternating turns to trigger chaos (every 2-4 turns)
  let turnIdx = 0;
  for (const [from, to] of OPENING_MOVES) {
    state = await getState(s1);
    const mover = state.turn === "w" ? s1 : s2;
    const res = await emit(mover, "move_piece", { from, to });
    if (!res.ok) {
      console.log(`move ${from}${to} FAILED (likely due to frozen piece / illegal after card):`, res.error);
      continue;
    }
    turnIdx++;
  }

  await new Promise((r) => setTimeout(r, 300));
  state = await getState(s1);
  console.log("Turns played:", state.turnNumber, "| Chaos events triggered:", chaosSeen);
  console.log("Final FEN:", state.fen);

  // Test disconnect/reconnect: drop s2, confirm opponent_disconnected fires on s1
  let disconnectNotified = false;
  s1.on("opponent_disconnected", () => (disconnectNotified = true));
  s2.disconnect();
  await new Promise((r) => setTimeout(r, 500));
  console.log("opponent_disconnected event received by s1:", disconnectNotified);

  s1.disconnect();
  console.log("SMOKE TEST COMPLETE - all core systems exercised.");
  process.exit(0);
})().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
