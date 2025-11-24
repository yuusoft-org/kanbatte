-- Event sourcing architecture with event_log as source of truth

CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partition TEXT NOT NULL,
  type TEXT NOT NULL,
  payload BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_partition ON event_log(partition);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at);