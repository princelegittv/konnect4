import { getSessionTokenFromCookieHeader } from "./cookies.js";
import { getUserFromSessionToken } from "./service.js";

export function resolveUserFromSocket(socket) {
  const token = getSessionTokenFromCookieHeader(socket.handshake.headers.cookie);
  return getUserFromSessionToken(token);
}
