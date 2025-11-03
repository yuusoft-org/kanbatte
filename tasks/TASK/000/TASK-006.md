---
title: Add table formatting to task list output
status: todo
priority: high
---

# Description
Add displayTaskTable function to commands.js that formats task list as ASCII table following roadmap.md specification with columns TaskId, Status, Title. Implementation should use Unicode box-drawing characters (┌─┬─┐, ├─┼─┤, └─┴─┘) for table borders, calculate column widths with TaskId (12 chars), Status (7 chars), Title (remaining width, truncate with '...' if exceeds 36 characters), format output with proper spacing, include total task count at bottom, and integrate with listTasks function. Should handle empty task lists with appropriate message and maintain consistent table formatting regardless of task data content.