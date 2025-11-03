---
title: Add kanbatte task create command to CLI
status: todo
priority: high
---

# Description
Add task create subcommand to task command group in cli.js that supports roadmap.md specified syntax `kanbatte task create TASK -t 'title' -d 'description' -p 'high'` and long-form `--title`, `--description`, `--priority` variants. Implementation should use commander.js argument structure with required type argument, required title option, optional description defaulting to empty string, and priority defaulting to 'medium'. The command should validate input format, connect to commands.createTask function with commandsDeps parameter, and handle missing required title option with clear error message. Command should be added to taskCmd command group created in TASK-001.