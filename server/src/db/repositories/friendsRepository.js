import crypto from "node:crypto";
import { getDatabase } from "../index.js";

const database = getDatabase();

function normalizeFriendshipPair(userA, userB) {
  return [userA, userB].sort((left, right) => left.localeCompare(right));
}

export function areFriends(userId, otherUserId) {
  const [userOneId, userTwoId] = normalizeFriendshipPair(userId, otherUserId);
  const row = database
    .prepare(`SELECT id FROM friendships WHERE user_one_id = ? AND user_two_id = ?`)
    .get(userOneId, userTwoId);

  return Boolean(row);
}

export function findExistingFriendRequest(senderUserId, receiverUserId) {
  const direct = database
    .prepare(
      `
      SELECT * FROM friend_requests
      WHERE sender_user_id = ? AND receiver_user_id = ?
      `,
    )
    .get(senderUserId, receiverUserId);

  if (direct) {
    return direct;
  }

  return database
    .prepare(
      `
      SELECT * FROM friend_requests
      WHERE sender_user_id = ? AND receiver_user_id = ?
      `,
    )
    .get(receiverUserId, senderUserId);
}

export function createFriendRequest(senderUserId, receiverUserId) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  database
    .prepare(
      `
      INSERT INTO friend_requests (id, sender_user_id, receiver_user_id, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
      `,
    )
    .run(id, senderUserId, receiverUserId, createdAt);

  return {
    id,
    senderUserId,
    receiverUserId,
    status: "pending",
    createdAt,
  };
}

export function updateFriendRequest(requestId, status) {
  const respondedAt = new Date().toISOString();
  database
    .prepare(`UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?`)
    .run(status, respondedAt, requestId);
}

export function createFriendship(userA, userB) {
  const [userOneId, userTwoId] = normalizeFriendshipPair(userA, userB);
  database
    .prepare(
      `
      INSERT OR IGNORE INTO friendships (id, user_one_id, user_two_id, created_at)
      VALUES (?, ?, ?, ?)
      `,
    )
    .run(crypto.randomUUID(), userOneId, userTwoId, new Date().toISOString());
}

export function listFriendRequestsForUser(userId) {
  return database
    .prepare(
      `
      SELECT
        fr.id,
        fr.sender_user_id,
        fr.receiver_user_id,
        fr.status,
        fr.created_at,
        sender.username AS sender_username,
        sender.avatar_type AS sender_avatar_type,
        sender.avatar_value AS sender_avatar_value,
        sender.rank_tier AS sender_rank_tier,
        sender.rank_points AS sender_rank_points,
        receiver.username AS receiver_username,
        receiver.avatar_type AS receiver_avatar_type,
        receiver.avatar_value AS receiver_avatar_value,
        receiver.rank_tier AS receiver_rank_tier,
        receiver.rank_points AS receiver_rank_points
      FROM friend_requests fr
      JOIN users sender ON sender.id = fr.sender_user_id
      JOIN users receiver ON receiver.id = fr.receiver_user_id
      WHERE (fr.sender_user_id = ? OR fr.receiver_user_id = ?) AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
      `,
    )
    .all(userId, userId)
    .map((row) => ({
      id: row.id,
      senderUserId: row.sender_user_id,
      receiverUserId: row.receiver_user_id,
      senderUsername: row.sender_username,
      senderAvatarType: row.sender_avatar_type,
      senderAvatarValue: row.sender_avatar_value,
      senderRankTier: row.sender_rank_tier,
      senderRankPoints: row.sender_rank_points,
      receiverUsername: row.receiver_username,
      receiverAvatarType: row.receiver_avatar_type,
      receiverAvatarValue: row.receiver_avatar_value,
      receiverRankTier: row.receiver_rank_tier,
      receiverRankPoints: row.receiver_rank_points,
      direction: row.sender_user_id === userId ? "outgoing" : "incoming",
      status: row.status,
      createdAt: row.created_at,
    }));
}

export function listFriendsForUser(userId) {
  return database
    .prepare(
      `
      SELECT
        friend.id,
        friend.username,
        friend.online_status,
        friend.rank_tier,
        friend.rank_points,
        friend.avatar_type,
        friend.avatar_value,
        friend.country,
        friend.region
      FROM friendships fs
      JOIN users friend
        ON friend.id = CASE
          WHEN fs.user_one_id = ? THEN fs.user_two_id
          ELSE fs.user_one_id
        END
      WHERE fs.user_one_id = ? OR fs.user_two_id = ?
      ORDER BY friend.online_status DESC, friend.username ASC
      `,
    )
    .all(userId, userId, userId)
    .map((row) => ({
      id: row.id,
      username: row.username,
      onlineStatus: row.online_status,
      rankTier: row.rank_tier,
      rankPoints: row.rank_points,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
      country: row.country,
      region: row.region,
    }));
}
