import { getDatabase } from "../index.js";

const database = getDatabase();

export function createSession(session) {
  database
    .prepare(
      `
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
      `,
    )
    .run(session.token, session.userId, session.createdAt, session.expiresAt);

  return session;
}

export function findSessionByToken(token) {
  const row = database.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
  return row
    ? {
        token: row.token,
        userId: row.user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }
    : null;
}

export function deleteSession(token) {
  database.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function purgeExpiredSessions(nowIso = new Date().toISOString()) {
  database.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).run(nowIso);
}
