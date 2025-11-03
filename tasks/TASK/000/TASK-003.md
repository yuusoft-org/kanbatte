---
title: Implement kanbatte task create logic
status: todo
priority: high
---

# Description
Implement createTask function in commands.js that validates title input, scans task directories to find next number, calculates folder path (tasks/{TYPE}/{000}/), creates directories, generates YAML frontmatter with title/status/priority/description, and writes task file.