---
title: Implement kanbatte task create logic
status: todo
priority: high
---

# Description
Implement createTask function in commands.js that handles roadmap.md task creation requirements with folder structure tasks/{TYPE}/{FOLDER}/{TYPE}-{NUMBER}.md where FOLDER calculated as Math.floor(NUMBER/100)*100 (000, 100, 200, etc.). Function must validate required title parameter with error output, scan existing task directories to determine next task number by reading .md files, use fs-extra to create directory structure if needed, generate YAML frontmatter exactly as "---\ntitle: [title]\nstatus: todo\npriority: [priority]\n---\n\n# Description\n\n[description]" format, write file to calculated path, and output success message with file path. Should handle edge cases like empty tasks directory and invalid task types gracefully.