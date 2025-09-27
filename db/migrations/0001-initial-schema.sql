-- Kanbatte Initial Database Schema
-- Event sourcing architecture with event_log as source of truth

-- Event log table - immutable event stream (source of truth)
CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_key ON event_log(key);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at);

-- Task view table - materialized view for fast queries
CREATE TABLE IF NOT EXISTS task_view (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  data BLOB NOT NULL,
  last_offset_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_view_key ON task_view(key);
CREATE INDEX IF NOT EXISTS idx_task_view_updated_at ON task_view(updated_at);