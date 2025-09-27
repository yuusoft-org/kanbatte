-- Remove redundant comments table (event sourcing uses task_view)
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_task_id;
DROP TABLE IF EXISTS comments;