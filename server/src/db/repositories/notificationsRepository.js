import crypto from "node:crypto";
import { getDatabase } from "../index.js";

const database = getDatabase();

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload_json),
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export function createNotification(userId, type, payload) {
  const notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    payloadJson: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  };

  database
    .prepare(
      `
      INSERT INTO notifications (id, user_id, type, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(
      notification.id,
      notification.userId,
      notification.type,
      notification.payloadJson,
      notification.createdAt,
    );

  return {
    id: notification.id,
    type,
    payload,
    createdAt: notification.createdAt,
    readAt: null,
  };
}

export function listNotificationsForUser(userId, limit = 25) {
  return database
    .prepare(
      `
      SELECT id, type, payload_json, created_at, read_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
    )
    .all(userId, limit)
    .map(mapNotification);
}

export function countUnreadNotificationsForUser(userId) {
  const result = database
    .prepare(
      `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ? AND read_at IS NULL
      `,
    )
    .get(userId);

  return Number(result?.unread_count ?? 0);
}

export function markAllNotificationsRead(userId) {
  const readAt = new Date().toISOString();

  database
    .prepare(
      `
      UPDATE notifications
      SET read_at = COALESCE(read_at, ?)
      WHERE user_id = ? AND read_at IS NULL
      `,
    )
    .run(readAt, userId);

  return listNotificationsForUser(userId);
}

export function markNotificationRead(userId, notificationId) {
  const readAt = new Date().toISOString();

  const result = database
    .prepare(
      `
      UPDATE notifications
      SET read_at = COALESCE(read_at, ?)
      WHERE id = ? AND user_id = ?
      `,
    )
    .run(readAt, notificationId, userId);

  return result.changes > 0;
}
