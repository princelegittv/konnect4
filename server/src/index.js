import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { registerAuthRoutes } from "./auth/routes.js";
import { CLIENT_URL, PORT } from "./config.js";
import { ensureCurrentSeason } from "./db/repositories/seasonsRepository.js";
import { registerPlatformRoutes } from "./platformRoutes.js";
import { configureRealtimeHub } from "./realtimeHub.js";
import { registerGameHandlers } from "./socketHandlers.js";

const allowedOrigins = [
  CLIENT_URL,
  "https://konnect4-client.vercel.app",
].filter(Boolean);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by Socket.IO CORS`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by Express CORS`));
    },
    credentials: true,
  }),
);

app.use(express.json());

configureRealtimeHub(io);
registerAuthRoutes(app);
registerPlatformRoutes(app);

app.get("/", (_req, res) => {
  res.send("Konnect4 backend is live");
});

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

ensureCurrentSeason();
registerGameHandlers(io);

server.listen(PORT, () => {
  console.log(`Konnect4 platform server listening on port ${PORT}`);
});
