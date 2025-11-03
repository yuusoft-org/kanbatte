---
title: Add kanbatte task create command to CLI
status: done
priority: high
---

# Description

### Tasks CLI

#### Creating Tasks

Create a new task with inline parameters:
```bash
kanbatte task create TASK -t 'title of the task' -d 'task description' -p 'high'
# Creates file in the correct folder with correct content

kanbatte task create TASK --title 'title of the task' --description 'task description' --priority 'high'
```

**Required:** Task type (positional argument) and title (`-t` / `--title`) are required.

**Optional:** Description (`-d` / `--description`) and priority (`-p` / `--priority`) are optional.

For task creation, the system needs to look at existing folders and files to get the latest ID, then create a new task file with the correct ID.

Tasks are organized in the structure below. Every repository will have a tasks folder.

### Design Considerations

- Tasks are grouped into folders (000, 100, 200, ..., 1000, 1100, etc.) so each folder can hold 100 tasks. This makes navigation easier for larger projects.
- Tasks start as TASK-001.md instead of TASK-1.md for consistent sorting. Folder sorting will break at folder 1000, but this is acceptable as it's a rare occurrence and folders are few in number.

### Task Types

Tasks have configurable types. Users can specify any type they want: TASK, FEAT, BUG, etc.

### Folder Structure

```
tasks/TASK/
    000/
      TASK-001.md
      TASK-002.md
      ...
      TASK-099.md
    100/
      TASK-100.md
      TASK-101.md
      ...
      TASK-199.md
    200/
      TASK-200.md
tasks/FEAT/
    000/
      FEAT-001.md
      FEAT-002.md
tasks/BUG/
    000/
      BUG-001.md
      BUG-002.md
```

### Task File Format

Example task file content:

```md
---
title: Task Title
status: todo
priority: low
---

# Description

Description ...

# More sections

...

```

Everything below the description is freeform. You can add more sections as needed.

**Status:** Can only be `todo` or `done`. We don't store `in-progress` because that is managed by the session itself.

**Priority:** Can be `low`, `medium`, or `high`.

Additional fields (such as assignee) may be added in the future.

# Acceptance Criteria

If all things done, run

```bash
kanbatte task create TASK -t 'title of the task' -d 'task description' -p 'high'
```

- [ ] Check if `tasks/TASK/000/TASK-002.md` exists, it shows the cli can correctly work.

# Implement Plan

## 1. Add New CLI Command Structure
- Add a new `task` command group to CLI (separate from existing `new task` command)
- Implement `kanbatte task create <TYPE>` subcommand with required arguments:
  - Positional: task type (TASK, FEAT, BUG, etc.)
  - Required: `-t/--title` for task title
  - Optional: `-d/--description` for task description
  - Optional: `-p/--priority` for task priority (low/medium/high, default: low)

## 2. Implement Folder/File Management Logic
- Create function to scan existing task folders and find next available ID
- Logic: Check `tasks/<TYPE>/` folders in order (000, 100, 200, etc.)
- For each folder, scan for existing task files and find next available number
- Create new folder if needed (e.g., if 000 is full, create 100)
- Generate task ID as `<TYPE>-###` format (e.g., TASK-002)

## 3. Implement Task File Creation
- Create markdown file with YAML frontmatter structure:
  ```yaml
  ---
  title: <task title>
  status: todo
  priority: <priority>
  ---

  # Description

  <task description>
  ```
- Ensure proper folder creation (`mkdir -p` if directory doesn't exist)
- Write file to correct path: `tasks/<TYPE>/<FOLDER>/<TYPE>-###.md`

## 4. Add Helper Functions
- `getNextTaskId(type)` - Scans folders and returns next available ID
- `createTaskFolders(type)` - Creates necessary folder structure
- `formatPriority(priority)` - Validates and formats priority values
- `generateTaskContent(title, description, priority)` - Creates markdown content

## 5. Integration Points
- Add new command group to `src/cli.js`
- Create new file `src/taskCommands.js` for task-specific logic
- Reuse existing output formatting utilities from `src/utils/output.js`
- Ensure error handling matches existing CLI patterns

## 6. Testing Strategy
- Test creating tasks with all combinations of arguments
- Test folder creation when directories don't exist
- Verify file creation with correct frontmatter and content structure