import { clearSessionCookie, createSessionCookie, getSessionTokenFromCookieHeader } from "./cookies.js";
import { getUserFromSessionToken, login, logout, signup } from "./service.js";

function sendError(response, error) {
  response.status(error.status ?? 500).json({
    ok: false,
    error: error.message ?? "Something went wrong.",
  });
}

export function registerAuthRoutes(app) {
  app.get("/api/auth/session", (request, response) => {
    const token = getSessionTokenFromCookieHeader(request.headers.cookie);
    const user = getUserFromSessionToken(token);

    response.json({
      ok: true,
      user,
    });
  });

  app.post("/api/auth/signup", (request, response) => {
    try {
      const result = signup(request.body ?? {});
      response.setHeader("Set-Cookie", createSessionCookie(result.sessionToken));
      response.status(201).json({
        ok: true,
        user: result.user,
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
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/auth/logout", (request, response) => {
    const token = getSessionTokenFromCookieHeader(request.headers.cookie);
    logout(token);
    response.setHeader("Set-Cookie", clearSessionCookie());
    response.json({ ok: true });
  });
}
