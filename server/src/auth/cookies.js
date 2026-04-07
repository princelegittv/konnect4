import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "../config.js";

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((cookies, chunk) => {
      const [name, ...rest] = chunk.split("=");
      cookies[name] = decodeURIComponent(rest.join("="));
      return cookies;
    }, {});
}

export function getSessionTokenFromCookieHeader(cookieHeader = "") {
  return parseCookies(cookieHeader)[SESSION_COOKIE_NAME] ?? null;
}

export function createSessionCookie(token) {
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
  });
}
