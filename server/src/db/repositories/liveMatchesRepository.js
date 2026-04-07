import { getDatabase } from "../index.js";

const database = getDatabase();

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function upsertLiveMatch({
  roomCode,
  mode,
  seasonId = null,
  status,
  playerOneUserId = null,
  playerTwoUserId = null,
  board,
  state,
  spectatorCount = 0,
  updatedAt = new Date().toISOString(),
}) {
  database
    .prepare(
      `
      INSERT INTO live_matches (
        room_code, mode, season_id, status, player_one_user_id, player_two_user_id,
        board_json, state_json, spectator_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_code) DO UPDATE SET
        mode = excluded.mode,
        season_id = excluded.season_id,
        status = excluded.status,
        player_one_user_id = excluded.player_one_user_id,
        player_two_user_id = excluded.player_two_user_id,
        board_json = excluded.board_json,
        state_json = excluded.state_json,
        spectator_count = excluded.spectator_count,
        updated_at = excluded.updated_at
      `,
    )
    .run(
      roomCode,
      mode,
      seasonId,
      status,
      playerOneUserId,
      playerTwoUserId,
      JSON.stringify(board),
      JSON.stringify(state),
      spectatorCount,
      updatedAt,
    );
}

export function deleteLiveMatch(roomCode) {
  database.prepare(`DELETE FROM live_matches WHERE room_code = ?`).run(roomCode);
}

export function listLiveMatches(limit = 30) {
  return database
    .prepare(
      `
      SELECT
        lm.room_code,
        lm.mode,
        lm.status,
        lm.board_json,
        lm.state_json,
        lm.spectator_count,
        lm.updated_at,
        player_one.username AS player_one_username,
        player_one.rank_tier AS player_one_rank_tier,
        player_one.rank_points AS player_one_rank_points,
        player_one.avatar_type AS player_one_avatar_type,
        player_one.avatar_value AS player_one_avatar_value,
        player_two.username AS player_two_username,
        player_two.rank_tier AS player_two_rank_tier,
        player_two.rank_points AS player_two_rank_points,
        player_two.avatar_type AS player_two_avatar_type,
        player_two.avatar_value AS player_two_avatar_value
      FROM live_matches lm
      LEFT JOIN users player_one ON player_one.id = lm.player_one_user_id
      LEFT JOIN users player_two ON player_two.id = lm.player_two_user_id
      ORDER BY lm.updated_at DESC
      LIMIT ?
      `,
    )
    .all(limit)
    .map((row) => ({
      roomCode: row.room_code,
      mode: row.mode,
      status: row.status,
      spectatorCount: row.spectator_count,
      updatedAt: row.updated_at,
      board: parseJson(row.board_json, []),
      state: parseJson(row.state_json, {}),
      players: [
        row.player_one_username
          ? {
              username: row.player_one_username,
              rankTier: row.player_one_rank_tier,
              rankPoints: row.player_one_rank_points,
              avatarType: row.player_one_avatar_type,
              avatarValue: row.player_one_avatar_value,
            }
          : null,
        row.player_two_username
          ? {
              username: row.player_two_username,
              rankTier: row.player_two_rank_tier,
              rankPoints: row.player_two_rank_points,
              avatarType: row.player_two_avatar_type,
              avatarValue: row.player_two_avatar_value,
            }
          : null,
      ].filter(Boolean),
    }));
}
