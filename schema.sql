CREATE TABLE IF NOT EXISTS scores (
  name_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  updated_at INTEGER NOT NULL,
  owner_session_id TEXT
);

CREATE INDEX IF NOT EXISTS scores_rank_idx
  ON scores (score DESC, updated_at ASC);


CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  last_submit_at INTEGER,
  submitted_score INTEGER NOT NULL DEFAULT 0,
  server_score INTEGER NOT NULL DEFAULT 0,
  batch_seq INTEGER NOT NULL DEFAULT 0,
  last_batch_at INTEGER
);

CREATE INDEX IF NOT EXISTS sessions_started_idx
  ON sessions (started_at);


CREATE TABLE IF NOT EXISTS global_stats (
  id INTEGER PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO global_stats (id, total)
VALUES (1, 0);
