import { getDatabase } from "../index.js";
import { getSeasonForDate } from "../../seasonSystem.js";

const database = getDatabase();

function mapSeason(row) {
  return row
    ? {
        id: row.id,
        label: row.label,
        startAt: row.start_at,
        endAt: row.end_at,
        status: row.status,
      }
    : null;
}

export function ensureCurrentSeason(now = new Date()) {
  const season = getSeasonForDate(now);
  const existing = database.prepare(`SELECT * FROM seasons WHERE id = ?`).get(season.id);

  database.prepare(`UPDATE seasons SET status = 'archived' WHERE end_at <= ?`).run(now.toISOString());

  if (!existing) {
    database
      .prepare(
        `
        INSERT INTO seasons (id, label, start_at, end_at, status, created_at)
        VALUES (?, ?, ?, ?, 'current', ?)
        `,
      )
      .run(season.id, season.label, season.startAt, season.endAt, now.toISOString());
  } else {
    database.prepare(`UPDATE seasons SET status = 'current' WHERE id = ?`).run(season.id);
  }

  return season;
}

export function getCurrentSeason() {
  return mapSeason(
    database
      .prepare(`SELECT id, label, start_at, end_at, status FROM seasons WHERE status = 'current' ORDER BY start_at DESC LIMIT 1`)
      .get(),
  );
}
