---
title: Add task command group to CLI
status: todo
priority: high
---

# Description
Add task command group to CLI by creating taskCmd constant in cli.js that registers 'task' command with 'Task management commands' description. The command group should follow roadmap.md task management structure and enable subcommands like create, list, locate. Implementation should use commander.js command structure, add proper help output when running `kanbatte task --help`, handle missing subcommand errors gracefully, and connect to task-related functions in commands.js through commandsDeps parameter. The task group should be added after existing command groups in cli.js without breaking current functionality.