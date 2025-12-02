CREATE TABLE IF NOT EXISTS discord_user_email_record (
  user_id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  email TEXT NOT NULL
);