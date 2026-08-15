CREATE TABLE IF NOT EXISTS scores (
  name_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS scores_rank_idx
  ON scores (score DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  last_submit_at INTEGER,
  submitted_score INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS sessions_started_idx
  ON sessions (started_at);
