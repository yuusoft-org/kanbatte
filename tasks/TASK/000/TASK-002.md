---
title: Add kanbatte task list command to CLI
status: done
priority: high
---

# Description

## Listing Tasks

List tasks as a table (only one format supported for now):

```bash
kanbatte task list
# list all tasks

kanbatte task list TASK
# Prints a table with columns: taskId, status, title

kanbatte task list TASK -s 'todo'
# Filter by status

kanbatte task list TASK -s 'todo' -p 'high,medium'
# Filter by status and priority
```

More information about tasks can reference to `./TASK-001.md`

# Acceptance Criteria

When implemented, running the following commands should work:

```bash
kanbatte task list
# Should list all tasks from all types in a table format

kanbatte task list TASK
# Should list all TASK type tasks in a table with columns: taskId, status, title

kanbatte task list TASK -s 'todo'
# Should list TASK tasks with todo status only

kanbatte task list TASK -s 'todo' -p 'high,medium'
# Should list TASK tasks with todo status and high or medium priority
```

Expected output format:
- Table with columns: Task ID | Status | Priority | Title
- Clean, aligned formatting
- Status filtering works (todo, done)
- Priority filtering works (low, medium, high, comma-separated)
- Type filtering works (TASK, FEAT, BUG, etc.)

# Implement Plan

## 1. Add New CLI Command Structure
- Add `kanbatte task list [TYPE]` command to existing task command group
- Implement optional flags:
  - `[TYPE]` (optional): Filter by task type (TASK, FEAT, BUG, etc.)
  - `-s, --status <status>` (optional): Filter by status (todo, done)
  - `-p, --priority <priority>` (optional): Filter by priority (low, medium, high, comma-separated)

## 2. Implement Task Discovery Logic
- Create function `scanTaskFiles(basePath, typeFilters)` to scan all task files
- Logic:
  - If no type filter specified, scan all `tasks/*` directories
  - If type filter specified, scan only `tasks/<TYPE>` directory
  - Recursively scan all numeric folders (000, 100, 200, etc.) within each type directory
  - Parse YAML frontmatter from each `.md` file to extract task metadata

## 3. Implement Task Parsing and Filtering
- Create function `parseTaskFile(filePath)` to extract task metadata from markdown files
- Parse YAML frontmatter to get: title, status, priority
- Extract taskId from filename (e.g., TASK-002.md → TASK-002)
- Implement filtering functions:
  - `filterByStatus(tasks, status)` - Filter tasks by status
  - `filterByPriority(tasks, priorities)` - Filter tasks by priority (supports comma-separated)
  - `filterByType(tasks, types)` - Filter tasks by type (supports comma-separated)

## 4. Implement Table Output Formatting
- Create function `formatTaskTable(tasks)` to format tasks as table
- Use existing CLI table formatting utilities from `src/utils/output.js` if available
- Table columns: Task ID | Status | Priority | Title
- Ensure proper column alignment and spacing
- Handle long titles with appropriate truncation if needed

## 5. Integration Points
- Extend existing task command group in `src/cli.js` with list subcommand
- Add task discovery functions to `src/taskCommands.js`
- Reuse existing error handling and output formatting patterns
- Ensure consistent CLI behavior with existing commands

## 6. Error Handling and Edge Cases
- Handle case where no tasks exist
- Handle invalid filter values (status, priority, type)
- Handle missing or malformed YAML frontmatter in task files
- Provide helpful error messages for invalid usage
- Handle case where specified task type directory doesn't exist

## 7. Testing Strategy
- Test listing all tasks (no filters)
- Test filtering by task type only
- Test filtering by status only
- Test filtering by priority only
- Test combining multiple filters
- Test edge cases: empty results, invalid filters, missing directories

