import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL ??
  (import.meta.env.DEV
    ? "http://localhost:3001"
    : typeof window !== "undefined"
      ? window.location.origin
      : "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  path: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  transports: ["polling", "websocket"],
});
