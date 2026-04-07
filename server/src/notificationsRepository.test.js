import test from "node:test";
import assert from "node:assert/strict";
import { createUser } from "./db/repositories/usersRepository.js";
import {
  countUnreadNotificationsForUser,
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "./db/repositories/notificationsRepository.js";

function createTestUser() {
  const uniqueKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  return createUser({
    id: `notification-user-${uniqueKey}`,
    username: `notify_${uniqueKey}`,
    email: `notify_${uniqueKey}@example.com`,
    passwordHash: "test-password-hash",
    country: "",
    region: "",
    onlineStatus: "online",
    rankTier: "Bronze",
    rankPoints: 0,
    winStreak: 0,
    rankedWins: 0,
    rankedLosses: 0,
    avatarType: "emoji",
    avatarValue: "\uD83D\uDD14",
    createdAt: now,
    updatedAt: now,
  });
}

test("notifications can be marked read individually and in bulk", () => {
  const user = createTestUser();
  const first = createNotification(user.id, "system_update", {
    message: "Season reset is coming soon.",
  });
  const second = createNotification(user.id, "game_invite", {
    fromUsername: "Rival",
  });

  assert.equal(countUnreadNotificationsForUser(user.id), 2);

  const markedOne = markNotificationRead(user.id, first.id);
  assert.equal(markedOne, true);
  assert.equal(countUnreadNotificationsForUser(user.id), 1);

  const afterSingleRead = listNotificationsForUser(user.id);
  assert.equal(afterSingleRead.find((entry) => entry.id === first.id)?.readAt !== null, true);
  assert.equal(afterSingleRead.find((entry) => entry.id === second.id)?.readAt, null);

  const afterBulkRead = markAllNotificationsRead(user.id);
  assert.equal(countUnreadNotificationsForUser(user.id), 0);
  assert.equal(afterBulkRead.every((entry) => entry.readAt), true);
});
