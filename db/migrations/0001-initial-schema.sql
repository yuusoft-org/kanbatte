-- Initial database schema
-- Creates the event_log and view tables for the CQRS event sourcing architecture

-- Event log table - append-only source of truth
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,        -- UUID
  key TEXT NOT NULL,          -- taskId for filtering/partitioning
  data BLOB NOT NULL,         -- MessagePack binary of JSON data
  created_at INTEGER NOT NULL -- Unix timestamp
);

CREATE INDEX idx_event_log_key ON event_log(key);
CREATE INDEX idx_event_log_created_at ON event_log(created_at);

-- View table - materialized view for fast queries
CREATE TABLE task_view (
  id TEXT PRIMARY KEY,               -- UUID
  key TEXT NOT NULL,                 -- Type-specific key (e.g., 'task:AI-001')
  data BLOB NOT NULL,                -- MessagePack binary of current state
  last_offset_id TEXT NOT NULL,      -- UUID of last event_log entry
  created_at INTEGER NOT NULL,       -- Unix timestamp (first creation)
  updated_at INTEGER NOT NULL        -- Unix timestamp (last update)
);

CREATE INDEX idx_task_view_key ON task_view(key);
CREATE INDEX idx_task_view_updated_at ON task_view(updated_at);