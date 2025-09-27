-- Down migration: Remove all tables
DROP TABLE IF EXISTS task_view;
DROP TABLE IF EXISTS event_log;