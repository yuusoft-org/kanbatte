CREATE TABLE IF NOT EXISTS discord_session_thread_record (
  session_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL
);