-- Discord event log table for tracking processed events and offset
CREATE TABLE IF NOT EXISTS discord_event_log (
  id TEXT PRIMARY KEY,
  offset_id INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_event_log_offset ON discord_event_log(offset_id);