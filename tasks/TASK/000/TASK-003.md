---
title: Add kanbatte task locate command to CLI
status: done
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

## Test Cases and Results

**After review fixes (using process.cwd() instead of __dirname)**

### Test Case 1: Basic locate in current project
```bash
bun run src/cli.js task locate TASK-001
```
**Expected**: `./tasks/TASK/000/TASK-001.md`
**Actual**: ✅ `./tasks/TASK/000/TASK-001.md`

### Test Case 2: Create and locate task in new project
```bash
mkdir -p /tmp/test-kanbatte-project && cd /tmp/test-kanbatte-project
bun run /home/jny738ngx/develop/kanbatte/src/cli.js task create TEST -t 'Test task in new project'
bun run /home/jny738ngx/develop/kanbatte/src/cli.js task locate TEST-001
```
**Expected**: Task created in `/tmp/test-kanbatte-project/tasks/`, return `./tasks/TEST/000/TEST-001.md`
**Actual**: ✅
- Task created successfully: `/tmp/test-kanbatte-project/tasks/TEST/000/TEST-001.md`
- Locate result: `./tasks/TEST/000/TEST-001.md`

### Test Case 3: Error handling - Invalid format
```bash
bun run src/cli.js task locate INVALID
```
**Expected**: Error message "Invalid task ID format: INVALID. Expected format: TYPE-123" and non-zero exit code
**Actual**: ✅ `Invalid task ID format: INVALID. Expected format: TYPE-123`

### Test Case 4: Error handling - Non-existent task
```bash
bun run src/cli.js task locate TASK-999
```
**Expected**: Error message "Task file not found: TASK-999" and non-zero exit code
**Actual**: ✅ `Task file not found: TASK-999`

### Test Case 5: Pipe functionality
```bash
bun run src/cli.js task locate BUG-001 | xargs head -1
```
**Expected**: First line of BUG-001.md file content (YAML frontmatter)
**Actual**: ✅ `---`

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
  - Construct expected file path using `projectRoot/tasks/<TYPE>/<FOLDER>/<TYPE>-<NUM>.md` (where projectRoot = process.cwd())
  - Verify file exists at that path
  - Return relative path `./tasks/<TYPE>/<FOLDER>/<TYPE>-<NUM>.md` if found, error if not found

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
- Add locate functionality to `src/taskCommands.js` using helper functions from `src/utils/tasks.js`
- Reuse existing error handling patterns from other commands
- Ensure output format is consistent with CLI conventions

## 6. Output Format
- Return relative path `./tasks/<TYPE>/<FOLDER>/<TYPE>-<NUM>.md` (consistent format)
- No additional formatting or explanation (just the path)
- Error messages go to stderr
- Non-zero exit code for errors, zero for success