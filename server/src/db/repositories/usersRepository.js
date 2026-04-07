import { getDatabase } from "../index.js";

const database = getDatabase();

function mapUser(row) {
  return row
    ? {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        country: row.country,
        region: row.region,
        onlineStatus: row.online_status,
        rankTier: row.rank_tier,
        rankPoints: row.rank_points,
        winStreak: row.win_streak,
        rankedWins: row.ranked_wins,
        rankedLosses: row.ranked_losses,
        avatarType: row.avatar_type,
        avatarValue: row.avatar_value,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export function createUser(user) {
  database
    .prepare(
      `
      INSERT INTO users (
        id, username, email, password_hash, country, region, online_status,
        rank_tier, rank_points, win_streak, ranked_wins, ranked_losses, avatar_type, avatar_value, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      user.id,
      user.username,
      user.email,
      user.passwordHash,
      user.country ?? "",
      user.region ?? "",
      user.onlineStatus ?? "offline",
      user.rankTier,
      user.rankPoints,
      user.winStreak,
      user.rankedWins,
      user.rankedLosses,
      user.avatarType ?? "emoji",
      user.avatarValue ?? "\uD83C\uDFAE",
      user.createdAt,
      user.updatedAt,
    );

  return findUserById(user.id);
}

export function findUserById(userId) {
  return mapUser(database.prepare(`SELECT * FROM users WHERE id = ?`).get(userId));
}

export function findUserByUsername(username) {
  return mapUser(
    database.prepare(`SELECT * FROM users WHERE lower(username) = lower(?)`).get(username),
  );
}

export function findUserByEmail(email) {
  return mapUser(database.prepare(`SELECT * FROM users WHERE email = ?`).get(email));
}

export function updateUserOnlineStatus(userId, onlineStatus) {
  database
    .prepare(`UPDATE users SET online_status = ?, updated_at = ? WHERE id = ?`)
    .run(onlineStatus, new Date().toISOString(), userId);
}

export function searchUsersByUsername(query, currentUserId, limit = 15) {
  return database
    .prepare(
      `
      SELECT
        id,
        username,
        country,
        region,
        online_status,
        rank_tier,
        rank_points,
        avatar_type,
        avatar_value
      FROM users
      WHERE id != ? AND username LIKE ?
      ORDER BY username ASC
      LIMIT ?
      `,
    )
    .all(currentUserId, `%${query}%`, limit)
    .map((row) => ({
      id: row.id,
      username: row.username,
      country: row.country,
      region: row.region,
      onlineStatus: row.online_status,
      rankTier: row.rank_tier,
      rankPoints: row.rank_points,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
    }));
}

export function updateUserRankStats(userId, rankUpdate) {
  database
    .prepare(
      `
      UPDATE users
      SET rank_tier = ?, rank_points = ?, win_streak = ?, ranked_wins = ?, ranked_losses = ?, updated_at = ?
      WHERE id = ?
      `,
    )
    .run(
      rankUpdate.rankTier,
      rankUpdate.rankPoints,
      rankUpdate.winStreak,
      rankUpdate.rankedWins,
      rankUpdate.rankedLosses,
      new Date().toISOString(),
      userId,
    );
}

export function updateUserAvatar(userId, avatarType, avatarValue) {
  database
    .prepare(
      `
      UPDATE users
      SET avatar_type = ?, avatar_value = ?, updated_at = ?
      WHERE id = ?
      `,
    )
    .run(avatarType, avatarValue, new Date().toISOString(), userId);

  return findUserById(userId);
}

export function listLeaderboard({
  scope = "global",
  region = null,
  country = null,
  limit = 50,
}) {
  const filters = [];
  const params = [];

  if (scope === "region" && region) {
    filters.push(`region = ?`);
    params.push(region);
  }

  if (scope === "country" && country) {
    filters.push(`country = ?`);
    params.push(country);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return database
    .prepare(
      `
      SELECT
        username,
        region,
        country,
        online_status,
        rank_tier,
        rank_points,
        ranked_wins,
        ranked_losses,
        avatar_type,
        avatar_value
      FROM users
      ${whereClause}
      ORDER BY rank_points DESC, ranked_wins DESC, username ASC
      LIMIT ?
      `,
    )
    .all(...params, limit)
    .map((row) => ({
      username: row.username,
      region: row.region,
      country: row.country,
      onlineStatus: row.online_status,
      rankTier: row.rank_tier,
      rankPoints: row.rank_points,
      rankedWins: row.ranked_wins,
      rankedLosses: row.ranked_losses,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
      winRate:
        row.ranked_wins + row.ranked_losses > 0
          ? Number(((row.ranked_wins / (row.ranked_wins + row.ranked_losses)) * 100).toFixed(1))
          : 0,
    }));
}
