import { clearSessionCookie, createSessionCookie, getSessionTokenFromCookieHeader } from "./cookies.js";
import { getUserFromSessionToken, login, logout, signup } from "./service.js";

function sendError(response, error) {
  response.status(error.status ?? 500).json({
    ok: false,
    error: error.message ?? "Something went wrong.",
  });
}

function getRequestSessionToken(request) {
  const cookieToken = getSessionTokenFromCookieHeader(request.headers.cookie);
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = String(request.headers.authorization ?? "").trim();
  const [scheme, bearerToken] = authHeader.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && bearerToken ? bearerToken : null;
}

export function registerAuthRoutes(app) {
  app.get("/api/auth/session", (request, response) => {
    const sessionToken = getRequestSessionToken(request);
    const user = getUserFromSessionToken(sessionToken);

    response.json({
      ok: true,
      user,
      sessionToken: user ? sessionToken : null,
    });
  });

  app.post("/api/auth/signup", (request, response) => {
    try {
      const result = signup(request.body ?? {});
      response.setHeader("Set-Cookie", createSessionCookie(result.sessionToken));
      response.status(201).json({
        ok: true,
        user: result.user,
        sessionToken: result.sessionToken,
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/auth/login", (request, response) => {
    try {
      const result = login(request.body ?? {});
      response.setHeader("Set-Cookie", createSessionCookie(result.sessionToken));
      response.json({
        ok: true,
        user: result.user,
        sessionToken: result.sessionToken,
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/auth/logout", (request, response) => {
    const token = getRequestSessionToken(request);
    logout(token);
    response.setHeader("Set-Cookie", clearSessionCookie());
    response.json({ ok: true });
  });
}
