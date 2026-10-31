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

(async () => {
  const p1 = await guest("Alice");
  const p2 = await guest("Bob");

  const s1 = connect(p1.token);
  const s2 = connect(p2.token);

  let roomCode;

  await new Promise((resolve) => s1.on("connect", resolve));
  await new Promise((resolve) => s2.on("connect", resolve));
  console.log("Both sockets connected");

  await new Promise((resolve) => {
    s1.emit("create_room", { turnSeconds: 30 }, (res) => {
      console.log("create_room ack:", res);
      roomCode = res.roomCode;
      resolve();
    });
  });

  let gameStarted = false;
  s2.on("game_start", (s) => {
    gameStarted = true;
    console.log("game_start received. Status:", s.status, "turn:", s.turn);
  });

  await new Promise((resolve) => {
    s2.emit("join_room", { roomCode }, (res) => {
      console.log("join_room ack:", res);
      resolve();
    });
  });

  await new Promise((r) => setTimeout(r, 300));
  console.log("gameStarted:", gameStarted);

  // Play a few chess moves alternating white (s1) / black (s2)
  await new Promise((resolve) => {
    s1.emit("move_piece", { from: "e2", to: "e4" }, (res) => {
      console.log("move e2e4 (white):", res);
      resolve();
    });
  });

  await new Promise((resolve) => {
    s2.emit("move_piece", { from: "e7", to: "e5" }, (res) => {
      console.log("move e7e5 (black):", res);
      resolve();
    });
  });

  // White plays a card (SHIELD on its own knight) - may or may not be in hand,
  // so just try each card in hand until one succeeds via play_card.
  let handTried = false;
  s1.emit("request_state", {}, (res) => {
    console.log("White hand:", res.state.hands.w);
    console.log("Deck count:", res.state.deckCount);
  });

  await new Promise((resolve) => {
    s1.emit("roll_dice", {}, (res) => {
      console.log("dice roll (white):", res);
      resolve();
    });
  });

  await new Promise((r) => setTimeout(r, 500));

  s1.emit("request_state", {}, (res) => {
    console.log("--- Final snapshot ---");
    console.log("FEN:", res.state.fen);
    console.log("Turn:", res.state.turn, "TurnNumber:", res.state.turnNumber);
    console.log("Effects:", JSON.stringify(res.state.effects));
    console.log("Status:", res.state.status);
    s1.disconnect();
    s2.disconnect();
    process.exit(0);
  });
})().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
