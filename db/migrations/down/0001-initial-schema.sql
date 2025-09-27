-- Drop all tables and indexes from initial schema

DROP INDEX IF EXISTS idx_task_view_updated_at;
DROP INDEX IF EXISTS idx_task_view_key;
DROP TABLE IF EXISTS task_view;

DROP INDEX IF EXISTS idx_event_log_created_at;
DROP INDEX IF EXISTS idx_event_log_key;
DROP TABLE IF EXISTS event_log;