-- Add view table for materialized state

CREATE TABLE IF NOT EXISTS view (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  data BLOB NOT NULL,
  last_offset_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_view_key ON view(key);
CREATE INDEX IF NOT EXISTS idx_view_updated_at ON view(updated_at);
