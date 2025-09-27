-- Drop task_view table and indexes
DROP INDEX IF EXISTS idx_task_view_updated_at;
DROP INDEX IF EXISTS idx_task_view_key;
DROP TABLE IF EXISTS task_view;