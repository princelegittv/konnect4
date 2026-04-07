import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL ??
  "https://konnect4-backend.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});