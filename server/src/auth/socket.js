import { getSessionTokenFromCookieHeader } from "./cookies.js";
import { getUserFromSessionToken } from "./service.js";

function getSessionTokenFromSocket(socket) {
  const cookieToken = getSessionTokenFromCookieHeader(socket.handshake.headers.cookie);
  if (cookieToken) {
    return cookieToken;
  }

  const authToken = String(socket.handshake.auth?.sessionToken ?? "").trim();
  if (authToken) {
    return authToken;
  }

  const authorizationHeader = String(socket.handshake.headers.authorization ?? "").trim();
  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() === "bearer" && token) {
    return token;
  }

  return null;
}

export function resolveUserFromSocket(socket) {
  const token = getSessionTokenFromSocket(socket);
  return getUserFromSessionToken(token);
}
