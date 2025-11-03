---
title: Add kanbatte task list command to CLI
status: todo
priority: high
---

# Description
Add task list subcommand to task command group in cli.js supporting roadmap.md syntax `kanbatte task list` (list all tasks), `kanbatte task list TASK` (filter by type), `kanbatte task list TASK -s 'todo'` (filter by status), and `kanbatte task list TASK -s 'todo' -p 'high,medium'` (filter by status and priority). Implementation should use commander.js with optional type argument, comma-separated status filtering via -s option, comma-separated priority filtering via -p option, connect to commands.listTasks function with commandsDeps parameter, and handle filtering logic in backend. Command should display formatted table output as specified in roadmap with columns taskId, status, title.