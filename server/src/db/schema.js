export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  online_status TEXT NOT NULL DEFAULT 'offline',
  rank_tier TEXT NOT NULL DEFAULT 'Bronze',
  rank_points INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  ranked_wins INTEGER NOT NULL DEFAULT 0,
  ranked_losses INTEGER NOT NULL DEFAULT 0,
  avatar_type TEXT NOT NULL DEFAULT 'emoji',
  avatar_value TEXT NOT NULL DEFAULT '🎮',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_season_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  rank_tier TEXT NOT NULL DEFAULT 'Bronze',
  rank_points INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  ranked_wins INTEGER NOT NULL DEFAULT 0,
  ranked_losses INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, season_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_all_time_stats (
  user_id TEXT PRIMARY KEY,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ranked_wins INTEGER NOT NULL DEFAULT 0,
  ranked_losses INTEGER NOT NULL DEFAULT 0,
  private_wins INTEGER NOT NULL DEFAULT 0,
  private_losses INTEGER NOT NULL DEFAULT 0,
  random_wins INTEGER NOT NULL DEFAULT 0,
  random_losses INTEGER NOT NULL DEFAULT 0,
  ranked_match_wins INTEGER NOT NULL DEFAULT 0,
  ranked_match_losses INTEGER NOT NULL DEFAULT 0,
  ai_wins INTEGER NOT NULL DEFAULT 0,
  ai_losses INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  sender_user_id TEXT NOT NULL,
  receiver_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  responded_at TEXT,
  UNIQUE (sender_user_id, receiver_user_id),
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_one_id TEXT NOT NULL,
  user_two_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_one_id, user_two_id),
  FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_history (
  id TEXT PRIMARY KEY,
  room_code TEXT,
  mode TEXT NOT NULL,
  season_id TEXT,
  status TEXT NOT NULL,
  winner_user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  rank_change_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  user_id TEXT,
  username_snapshot TEXT NOT NULL,
  rank_tier_snapshot TEXT,
  result TEXT NOT NULL,
  rank_points_change INTEGER NOT NULL DEFAULT 0,
  is_ai INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (match_id) REFERENCES match_history(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS live_matches (
  room_code TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  season_id TEXT,
  status TEXT NOT NULL,
  player_one_user_id TEXT,
  player_two_user_id TEXT,
  board_json TEXT NOT NULL,
  state_json TEXT NOT NULL,
  spectator_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank_points DESC, username ASC);
CREATE INDEX IF NOT EXISTS idx_users_region_rank ON users(region, rank_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_country_rank ON users(country, rank_points DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status ON friend_requests(receiver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`;
