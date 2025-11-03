---
title: Implement task list scanning logic
status: todo
priority: high
---

# Description
Create listTasks function in commands.js that scans tasks/{TYPE}/{FOLDER}/ directories for .md files, parses YAML frontmatter to extract title, status, priority fields using regex pattern `---\n([\s\S]*?)\n---`, implements filtering logic for status (-s option) and priority (-p option) with comma-separated value parsing and array filtering, sorts tasks by taskId alphanumerically, and outputs formatted task list. Should handle edge cases like empty tasks directories, missing YAML frontmatter, invalid YAML parsing, and non-existent task types gracefully with appropriate error messages.