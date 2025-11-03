---
title: Add kanbatte task locate command to CLI
status: todo
priority: high
---

# Description

#### Updating Tasks

Tasks are updated by editing the file content manually. This approach is much simpler.

```bash
kanbatte task locate TASK-001
# Convenience method that returns the relative path of the task: ./tasks/TASK/000/TASK-001.md
# For example: kanbatte task locate TASK-001 | xargs vim
```

More information about tasks can reference to `./TASK-001.md`

# Acceptance Criteria

When implemented, running the following command should work:

```bash
kanbatte task locate TASK-001
# Should output: ./tasks/TASK/000/TASK-001.md

kanbatte task locate TASK-001 | xargs vim
# Should open the task file in vim editor

kanbatte task locate NONEXISTENT
# Should output appropriate error message and return non-zero exit code
```

Expected behavior:
- Takes task ID as positional argument
- Returns relative path to the task file
- Handles non-existent task IDs with proper error messages
- Works with all task types (TASK, FEAT, BUG, etc.)
- Path is relative to current working directory

# Implement Plan

## 1. Add New CLI Command Structure
- Add `kanbatte task locate <taskId>` command to existing task command group
- Implement required argument:
  - `<taskId>` (required): Task ID to locate (e.g., TASK-001, FEAT-002, etc.)

## 2. Implement Task Location Logic
- Create function `locateTask(projectRoot, taskId)` that finds the file path
- Logic:
  - Parse task ID to extract type (TASK, FEAT, BUG, etc.) and number
  - Calculate which folder the task should be in based on number:
    - 1-99 → folder "000"
    - 100-199 → folder "100"
    - 200-299 → folder "200"
    - etc.
  - Construct expected file path: `./tasks/<TYPE>/<FOLDER>/<TYPE>-<NUM>.md`
  - Verify file exists at that path
  - Return relative path if found, error if not found

## 3. Add Helper Functions
- `parseTaskId(taskId)` - Extract type and number from task ID
- `calculateFolder(number)` - Determine folder based on task number
- `buildTaskPath(projectRoot, type, folder, taskId)` - Construct file path
- `taskExists(filePath)` - Check if task file exists

## 4. Error Handling
- Handle invalid task ID format (e.g., missing dash, invalid characters)
- Handle non-existent task files
- Provide clear error messages for:
  - Invalid task ID format
  - Task file not found
  - File system access errors

## 5. Integration Points
- Extend existing task command group in `src/cli.js` with locate subcommand
- Add locate functionality to `src/taskCommands.js` or create new function in `src/taskUtils.js`
- Reuse existing error handling patterns from other commands
- Ensure output format is consistent with CLI conventions

## 6. Output Format
- Always return relative path starting with `./tasks/`
- No additional formatting or explanation (just the path)
- Error messages go to stderr
- Non-zero exit code for errors, zero for success

## 7. Testing Strategy
- Test locating existing tasks with different types (TASK, FEAT, BUG)
- Test with valid but non-existent task IDs
- Test with invalid task ID formats
- Test pipe to editor (`| xargs vim`) functionality
- Verify relative paths work from different working directories
