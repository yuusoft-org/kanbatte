-- Discord channels configuration table
CREATE TABLE IF NOT EXISTS discord_channels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);