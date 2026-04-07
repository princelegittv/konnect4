import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_FILE, DATA_DIRECTORY } from "../config.js";
import { SCHEMA_SQL } from "./schema.js";

fs.mkdirSync(DATA_DIRECTORY, { recursive: true });

const database = new DatabaseSync(DATABASE_FILE);
database.exec(SCHEMA_SQL);

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

ensureColumn("users", "avatar_type", "TEXT NOT NULL DEFAULT 'emoji'");
ensureColumn("users", "avatar_value", "TEXT NOT NULL DEFAULT '🎮'");

export function getDatabase() {
  return database;
}
