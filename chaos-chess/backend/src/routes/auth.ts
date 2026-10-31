import { Router } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// POST /api/auth/guest  { username?: string }
// Issues a lightweight guest identity. No password, no email required.
router.post("/guest", (req, res) => {
  const requestedName = (req.body?.username as string | undefined)?.trim();
  const playerId = uuidv4();
  const username =
    requestedName && requestedName.length > 0
      ? requestedName.slice(0, 20)
      : `Guest${Math.floor(1000 + Math.random() * 9000)}`;

  const token = jwt.sign({ playerId, username, guest: true }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ token, playerId, username });
});

// Google login is intentionally not wired up in this MVP.
// To add it: verify a Google ID token with `google-auth-library`, upsert a
// User row via Prisma, then sign a JWT the same way as above.
router.post("/google", (_req, res) => {
  res.status(501).json({ error: "Google login not implemented in this build. See README." });
});

export default router;
