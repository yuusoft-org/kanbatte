-- Discord plugin tables - completely separate from main kanbatte tables

-- Discord event log table for tracking processed events and offset
CREATE TABLE IF NOT EXISTS discord_event_log (
  id TEXT PRIMARY KEY,
  offset_id INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discord_event_log_offset ON discord_event_log(offset_id);

-- Discord channels configuration table
CREATE TABLE IF NOT EXISTS discord_channels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);