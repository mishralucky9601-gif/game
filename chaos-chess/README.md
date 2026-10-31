# ♟️ Chaos Chess

Real-time multiplayer chess — with an Uno-style card deck, a chaos dice, and
random board-wide events layered on top. Two players, one board, zero
predictability.

This repo is a **working core-loop implementation**: real-time 2-player
matches with server-authoritative chess validation, 6 cards, 6 dice outcomes,
and 6 chaos events, running over Socket.IO with reconnect handling. It is
**not** the full feature list from the original spec (tournaments, AI
opponent, replays, Google login, etc.) — see [What's Included](#whats-included-vs-stubbed)
below for the honest breakdown and how to extend it.

```
chaos-chess/
├── backend/     Express + Socket.IO + TypeScript + Prisma
└── frontend/    Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion
```

---

## Quick Start (local dev)

You need Node.js 18+ and (optionally, for persistence) a Postgres database —
the game itself runs entirely in-memory per room, so you can play without a
database connected at all.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # edit JWT_SECRET; DATABASE_URL only needed if you wire up persistence
npm run dev                 # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # defaults already point at localhost:4000
npm run dev                 # starts on http://localhost:3000
```

Open two browser windows (or one normal + one incognito) at
`http://localhost:3000`, create a room in one, join with the room code in the
other, and play.

---

## How the game works

- Standard chess rules, enforced **server-side** via `chess.js` inside
  `GameEngine` — the client never decides whether a move is legal.
- Each player starts with 3 random cards from a 6-card deck (Skip, Draw Two,
  Swap Pieces, Freeze Piece, Double Move, Shield). Cards are playable only on
  your own turn.
- A dice button is available once per turn with 6 weighted outcomes (extra
  turn, revive a captured piece, random teleport, lose next turn, bonus card,
  shield a random piece).
- Every 2–4 turns (randomized), a chaos event fires automatically: board
  rotation, random piece swap, fog of war, random explosion, time freeze, or
  everyone draws a card.
- Turn timer defaults to 60s; if it expires, the server plays a random legal
  move for you and passes the turn.
- If a player disconnects, their opponent is notified immediately and the
  disconnected player has 60 seconds to reconnect (same browser session /
  token) before it's scored as an abandonment win.

## What's included vs. stubbed

**Fully working:**
- Guest auth (JWT), room create/join by code, invite link copy
- Real-time board sync, legal move validation, captures, checkmate/stalemate/draw detection
- 6 cards, 6 dice outcomes, 6 chaos events — all server-authoritative
- Turn timer with auto-move-on-timeout
- Disconnect detection + reconnect grace window
- Chat, resign, sound effects (synthesized, no audio files needed), animations, PWA manifest
- Responsive dark-glassmorphism UI for desktop/tablet/mobile

**Stubbed / not implemented** (Prisma schema supports all of these — the
plumbing to actually persist and read from Postgres is the missing piece):
- Match/move persistence to the database (currently matches live in memory
  and are lost when the process restarts or the game ends)
- Leaderboards (Daily/Weekly/Global/Friends) — UI placeholder points to where
  a real `GET /api/leaderboard` endpoint would plug in
- ELO calculation, achievements, win streak tracking
- Google login (route returns `501`; see comment in `backend/src/routes/auth.ts`)
- AI opponent, replay system, tournaments, season pass, custom skins/boards,
  friend system, emotes, spectator mode

### Extending persistence (recommended next step)

1. Run `npx prisma migrate dev` against a real `DATABASE_URL` (Neon works
   great — see below) to create the tables.
2. In `GameEngine.endGame()`, write a `Match` + `Move[]` row via
   `@prisma/client` when a game finishes.
3. Add a `GET /api/leaderboard?period=global` route that reads/aggregates
   `LeaderboardEntry`, and wire the Leaderboard modal in the frontend to it.
4. For Google login: verify an ID token with `google-auth-library`, upsert a
   `User` row, sign the same JWT shape the guest route already produces.

---

## Card / Dice / Chaos reference

| Card | Effect |
|---|---|
| Skip | Opponent loses their next turn |
| Draw Two | Opponent draws two cards |
| Swap Pieces | Swap two of your own pieces' positions |
| Freeze Piece | Target opponent piece can't move next turn |
| Double Move | Take an extra move immediately after this one |
| Shield | Target piece can't be captured until your next turn |

| Dice outcome | Effect |
|---|---|
| Extra Turn | Immediate bonus move |
| Revive Piece | A captured piece of yours returns to a random empty square |
| Random Teleport | One of your pieces jumps to a random empty square |
| Lose Next Turn | You skip your next turn |
| Bonus Card | Draw one card |
| Shield Random | A random one of your pieces is shielded |

| Chaos event | Effect |
|---|---|
| Board Rotates | Board flips 180° for both players |
| Pieces Swap | Two random pieces swap positions (never kings) |
| Fog of War | Marks a 3-turn fog window (`fogOfWarUntilTurn` in state — wire up client-side rendering to taste) |
| Random Explosion | A random non-king piece is destroyed |
| Time Freeze | Turn timer doubles |
| Everyone Draws | Both players draw a card |

---

## Architecture notes

- **State model:** one `GameEngine` instance per room, held in memory in
  `backend/src/socket/socketHandler.ts` (`Map<roomCode, GameEngine>`). This
  is the right call for a 2-player-per-room game and keeps latency low; if
  you need horizontal scaling across multiple backend instances, move this
  map to Redis (or use Socket.IO's Redis adapter for pub/sub + a shared game
  state store) rather than rewriting the engine.
- **Turn skip implementation:** `chess.js` has no native "pass" move, so
  `GameEngine.skipTurnFor()` edits the active-color field of the FEN directly
  to flip the turn back. This is intentional and safe — it never touches
  piece placement.
- **Security:** every move/card/dice/chaos action is validated server-side
  against the authenticated player's assigned color; a client cannot move
  the opponent's pieces or act out of turn no matter what it sends. Basic
  per-socket rate limiting guards against event spam.

---

## Deployment

### Frontend → Vercel

1. Push this repo to GitHub.
2. In Vercel, import the repo, set **Root Directory** to `frontend`.
3. Environment variables:
   - `NEXT_PUBLIC_API_URL` = your backend's public URL
   - `NEXT_PUBLIC_SOCKET_URL` = same backend URL
4. Deploy. Vercel auto-detects Next.js.

### Backend → Railway or Render

1. New service from the same GitHub repo, **Root Directory** `backend`.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Environment variables:
   - `PORT` (Railway/Render set this automatically — don't hardcode)
   - `CLIENT_URL` = your deployed frontend URL (needed for CORS)
   - `JWT_SECRET` = a long random string
   - `DATABASE_URL` = your Neon connection string (see below)
5. If you're using Prisma, add `npx prisma generate` to the build command and
   `npx prisma migrate deploy` as a release/post-deploy step.

### Database → Neon (Postgres)

1. Create a project at neon.tech, copy the pooled connection string into
   `DATABASE_URL` on the backend host.
2. Run `npx prisma migrate dev --name init` locally once against that URL to
   create tables, then use `prisma migrate deploy` in CI/production.

---

## Testing

Two smoke-test scripts exercise the live backend over real Socket.IO
connections (no mocking) — useful as a sanity check after any engine change:

```bash
cd backend
npm run dev &                         # start the server in one terminal
node scripts/smoke-test-basic.js      # join flow, moves, dice, state sync
node scripts/smoke-test-cards-chaos.js  # cards, chaos-event cadence, disconnect handling
```

Both scripts spin up two guest sessions, create/join a room, and play through
real game actions, printing the resulting state so you can eyeball
correctness. For a proper test suite, wrap `GameEngine` in unit tests (it has
no Socket.IO or Express dependency, so it's trivial to instantiate directly
in e.g. Jest/Vitest).

Manual test checklist:
- [ ] Create room in browser A, join with the code in browser B (or an
      incognito window) — confirm both boards sync
- [ ] Make a move in A, confirm it appears instantly in B
- [ ] Play a card requiring a target (Freeze Piece / Shield / Swap Pieces),
      confirm the target-picker UI and the resulting effect
- [ ] Roll dice, confirm the toast + effect
- [ ] Let a turn timer expire, confirm a random move auto-plays
- [ ] Close browser B mid-game, confirm A sees "opponent disconnected"
- [ ] Reopen B within 60s, confirm the game resumes correctly
- [ ] Play to checkmate, confirm the game-over screen shows for both players
- [ ] Test on a real mobile browser (not just devtools emulation) for touch
      drag-and-drop on the board

---

## Tech stack

**Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS,
Framer Motion, react-chessboard, chess.js, socket.io-client, Zustand, PWA
manifest.

**Backend:** Node.js, Express, Socket.IO, TypeScript, chess.js, jsonwebtoken,
Prisma ORM (schema included; wiring is the next step — see above).

**Suggested hosting:** Vercel (frontend) + Railway/Render (backend) + Neon
(Postgres).
