import { getSessionTokenFromCookieHeader } from "./cookies.js";
import { getUserFromSessionToken } from "./service.js";

function getSessionTokenFromAuthorizationHeader(authorizationHeader = "") {
  const [scheme, token] = String(authorizationHeader).trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function resolveUserFromRequest(request) {
  const token =
    getSessionTokenFromCookieHeader(request.headers.cookie) ??
    getSessionTokenFromAuthorizationHeader(request.headers.authorization);
  return getUserFromSessionToken(token);
}

export function requireAuthenticatedUser(request, response, next) {
  const user = resolveUserFromRequest(request);

  if (!user) {
    response.status(401).json({
      ok: false,
      error: "Authentication required.",
    });
    return;
  }

  request.user = user;
  next();
}
