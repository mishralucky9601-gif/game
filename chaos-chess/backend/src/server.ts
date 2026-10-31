import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import authRouter from "./routes/auth";
import { registerSocketHandlers } from "./socket/socketHandler";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "chaos-chess-backend" }));
app.use("/api/auth", authRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Chaos Chess backend listening on port ${PORT}`);
});
