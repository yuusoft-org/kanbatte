-- Event sourcing architecture with event_log as source of truth

CREATE TABLE IF NOT EXISTS discord_event_log (
  id TEXT PRIMARY KEY,
  partition TEXT NOT NULL,
  type TEXT NOT NULL,
  payload BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_event_log_partition ON discord_event_log(partition);
CREATE INDEX IF NOT EXISTS idx_discord_event_log_created_at ON discord_event_log(created_at);