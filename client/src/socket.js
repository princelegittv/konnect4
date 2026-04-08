import { io } from "socket.io-client";
import { getStoredSessionToken } from "./api";

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
  auth: {
    sessionToken: getStoredSessionToken(),
  },
});

export function syncSocketSessionToken() {
  socket.auth = {
    ...(socket.auth ?? {}),
    sessionToken: getStoredSessionToken(),
  };
}
