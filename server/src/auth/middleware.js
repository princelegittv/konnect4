import { getSessionTokenFromCookieHeader } from "./cookies.js";
import { getUserFromSessionToken } from "./service.js";

export function resolveUserFromRequest(request) {
  const token = getSessionTokenFromCookieHeader(request.headers.cookie);
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
