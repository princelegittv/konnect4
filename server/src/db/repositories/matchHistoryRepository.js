import crypto from "node:crypto";
import { getDatabase } from "../index.js";

const database = getDatabase();

export function createMatchHistoryRecord({
  roomCode = null,
  mode,
  seasonId = null,
  status = "playing",
  startedAt = new Date().toISOString(),
  metadata = {},
}) {
  const id = crypto.randomUUID();

  database
    .prepare(
      `
      INSERT INTO match_history (
        id, room_code, mode, season_id, status, winner_user_id,
        started_at, ended_at, rank_change_json, metadata_json
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?)
      `,
    )
    .run(id, roomCode, mode, seasonId, status, startedAt, JSON.stringify(metadata));

  return id;
}

export function finalizeMatchHistoryRecord({
  matchId,
  status = "finished",
  winnerUserId = null,
  endedAt = new Date().toISOString(),
  rankChanges = null,
  metadata = {},
  participants = [],
}) {
  database
    .prepare(
      `
      UPDATE match_history
      SET status = ?, winner_user_id = ?, ended_at = ?, rank_change_json = ?, metadata_json = ?
      WHERE id = ?
      `,
    )
    .run(
      status,
      winnerUserId,
      endedAt,
      rankChanges ? JSON.stringify(rankChanges) : null,
      JSON.stringify(metadata),
      matchId,
    );

  database.prepare(`DELETE FROM match_participants WHERE match_id = ?`).run(matchId);

  const statement = database.prepare(
    `
    INSERT INTO match_participants (
      match_id, user_id, username_snapshot, rank_tier_snapshot, result, rank_points_change, is_ai
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  );

  for (const participant of participants) {
    statement.run(
      matchId,
      participant.userId ?? null,
      participant.usernameSnapshot,
      participant.rankTierSnapshot ?? null,
      participant.result,
      participant.rankPointsChange ?? 0,
      participant.isAi ? 1 : 0,
    );
  }
}
