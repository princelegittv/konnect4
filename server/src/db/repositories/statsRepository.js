import { getDatabase } from "../index.js";

const database = getDatabase();

const MODE_COLUMN_MAP = {
  private: { wins: "private_wins", losses: "private_losses" },
  matchmaking: { wins: "random_wins", losses: "random_losses" },
  ranked: { wins: "ranked_match_wins", losses: "ranked_match_losses" },
  ai: { wins: "ai_wins", losses: "ai_losses" },
};

export function ensureUserSeasonStats(userId, seasonId, defaults) {
  database
    .prepare(
      `
      INSERT OR IGNORE INTO user_season_stats (
        user_id, season_id, rank_tier, rank_points, win_streak, ranked_wins, ranked_losses,
        matches_played, wins, losses, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
      `,
    )
    .run(
      userId,
      seasonId,
      defaults.rankTier,
      defaults.rankPoints,
      defaults.winStreak,
      defaults.rankedWins,
      defaults.rankedLosses,
      new Date().toISOString(),
    );
}

export function ensureUserAllTimeStats(userId) {
  database
    .prepare(
      `
      INSERT OR IGNORE INTO user_all_time_stats (user_id, updated_at)
      VALUES (?, ?)
      `,
    )
    .run(userId, new Date().toISOString());
}

export function getUserSeasonStats(userId, seasonId) {
  const row = database
    .prepare(
      `
      SELECT rank_tier, rank_points, win_streak, ranked_wins, ranked_losses, matches_played, wins, losses
      FROM user_season_stats
      WHERE user_id = ? AND season_id = ?
      `,
    )
    .get(userId, seasonId);

  return row
    ? {
        rankTier: row.rank_tier,
        rankPoints: row.rank_points,
        winStreak: row.win_streak,
        rankedWins: row.ranked_wins,
        rankedLosses: row.ranked_losses,
        matchesPlayed: row.matches_played,
        wins: row.wins,
        losses: row.losses,
      }
    : null;
}

export function getUserAllTimeStats(userId) {
  const row = database
    .prepare(
      `
      SELECT *
      FROM user_all_time_stats
      WHERE user_id = ?
      `,
    )
    .get(userId);

  return row
    ? {
        matchesPlayed: row.matches_played,
        wins: row.wins,
        losses: row.losses,
        rankedWins: row.ranked_wins,
        rankedLosses: row.ranked_losses,
        privateWins: row.private_wins,
        privateLosses: row.private_losses,
        randomWins: row.random_wins,
        randomLosses: row.random_losses,
        rankedMatchWins: row.ranked_match_wins,
        rankedMatchLosses: row.ranked_match_losses,
        aiWins: row.ai_wins,
        aiLosses: row.ai_losses,
        onlineWins: row.private_wins + row.random_wins + row.ranked_match_wins,
        onlineLosses: row.private_losses + row.random_losses + row.ranked_match_losses,
      }
    : null;
}

export function recordCompletedMatchForUser({
  userId,
  seasonId,
  mode,
  outcome,
  ranked = false,
  rankTier = "Bronze",
  rankPoints = 0,
  winStreak = 0,
}) {
  ensureUserSeasonStats(userId, seasonId, {
    rankTier,
    rankPoints,
    winStreak,
    rankedWins: 0,
    rankedLosses: 0,
  });
  ensureUserAllTimeStats(userId);

  const now = new Date().toISOString();
  const isWin = outcome === "win";
  const isLoss = outcome === "loss";
  const isDraw = outcome === "draw";

  database
    .prepare(
      `
      UPDATE user_season_stats
      SET
        rank_tier = ?,
        rank_points = ?,
        win_streak = ?,
        ranked_wins = ranked_wins + ?,
        ranked_losses = ranked_losses + ?,
        matches_played = matches_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        updated_at = ?
      WHERE user_id = ? AND season_id = ?
      `,
    )
    .run(
      rankTier,
      rankPoints,
      isDraw ? 0 : winStreak,
      ranked && isWin ? 1 : 0,
      ranked && isLoss ? 1 : 0,
      isWin ? 1 : 0,
      isLoss ? 1 : 0,
      now,
      userId,
      seasonId,
    );

  const modeColumns = MODE_COLUMN_MAP[mode] ?? null;
  const modeWinsSql = modeColumns && isWin ? `${modeColumns.wins} = ${modeColumns.wins} + 1,` : "";
  const modeLossesSql =
    modeColumns && isLoss ? `${modeColumns.losses} = ${modeColumns.losses} + 1,` : "";

  database
    .prepare(
      `
      UPDATE user_all_time_stats
      SET
        matches_played = matches_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        ranked_wins = ranked_wins + ?,
        ranked_losses = ranked_losses + ?,
        ${modeWinsSql}
        ${modeLossesSql}
        updated_at = ?
      WHERE user_id = ?
      `,
    )
    .run(
      isWin ? 1 : 0,
      isLoss ? 1 : 0,
      ranked && isWin ? 1 : 0,
      ranked && isLoss ? 1 : 0,
      now,
      userId,
    );
}

export function getSeasonLeaderboard({
  seasonId,
  scope = "global",
  region = null,
  country = null,
  limit = 50,
}) {
  const filters = [`uss.season_id = ?`];
  const params = [seasonId];

  if (scope === "region" && region) {
    filters.push(`u.region = ?`);
    params.push(region);
  }

  if (scope === "country" && country) {
    filters.push(`u.country = ?`);
    params.push(country);
  }

  return database
    .prepare(
      `
      SELECT
        u.username,
        u.region,
        u.country,
        u.online_status,
        u.avatar_type,
        u.avatar_value,
        uss.rank_tier,
        uss.rank_points,
        uss.ranked_wins,
        uss.ranked_losses
      FROM user_season_stats uss
      JOIN users u ON u.id = uss.user_id
      WHERE ${filters.join(" AND ")}
      ORDER BY uss.rank_points DESC, uss.ranked_wins DESC, u.username ASC
      LIMIT ?
      `,
    )
    .all(...params, limit)
    .map((row) => ({
      username: row.username,
      region: row.region,
      country: row.country,
      onlineStatus: row.online_status,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
      rankTier: row.rank_tier,
      rankPoints: row.rank_points,
      rankedWins: row.ranked_wins,
      rankedLosses: row.ranked_losses,
      winRate:
        row.ranked_wins + row.ranked_losses > 0
          ? Number(((row.ranked_wins / (row.ranked_wins + row.ranked_losses)) * 100).toFixed(1))
          : 0,
    }));
}
