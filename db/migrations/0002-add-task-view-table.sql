-- Add the task_view table that was missing from initial migration
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