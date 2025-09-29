-- Event sourcing architecture with event_log as source of truth

CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_key ON event_log(key);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at);