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

### Test Case 1: Locate existing task from project root
```bash
bun run src/cli.js task locate TASK-001
```
**Expected**: `tasks/TASK/000/TASK-001.md`
**Actual**: ✅ `tasks/TASK/000/TASK-001.md`

### Test Case 2: Locate task with different type
```bash
bun run src/cli.js task locate BUG-001
```
**Expected**: `tasks/BUG/000/BUG-001.md`
**Actual**: ✅ `tasks/BUG/000/BUG-001.md`

### Test Case 3: Locate non-existent task ID
```bash
bun run src/cli.js task locate TASK-999
```
**Expected**: Error message "Task file not found: TASK-999" and non-zero exit code
**Actual**: ✅ `Task file not found: TASK-999` (exit code: 1)

### Test Case 4: Invalid task ID format
```bash
bun run src/cli.js task locate INVALID
```
**Expected**: Error message "Invalid task ID format: INVALID. Expected format: TYPE-123"
**Actual**: ✅ `Invalid task ID format: INVALID. Expected format: TYPE-123`

### Test Case 5: Path from different working directory
```bash
cd /tmp && bun run /home/jny738ngx/develop/kanbatte/src/cli.js task locate TASK-001
```
**Expected**: Path relative to `/tmp` directory
**Actual**: ✅ `../home/jny738ngx/develop/kanbatte/tasks/TASK/000/TASK-001.md`
**Note**: This is correct! From `/tmp` to `/home/user/project`, you need `..` to go back to `/`, then `home/user/project`

### Test Case 6: Path from subdirectory
```bash
mkdir test && cd test && bun run ../src/cli.js task locate TASK-001
```
**Expected**: Path relative to `test` subdirectory
**Actual**: ✅ `../tasks/TASK/000/TASK-001.md`

### Test Case 7: Pipe to editor functionality
```bash
bun run src/cli.js task locate BUG-001 | xargs head -1
```
**Expected**: First line of BUG-001.md file content
**Actual**: ✅ `---` (YAML frontmatter start)

### Test Case 8: Pipe from different directory
```bash
cd docs && bun run ../src/cli.js task locate TASK-001 | xargs head -1
```
**Expected**: First line of TASK-001.md file content
**Actual**: ✅ `---` (YAML frontmatter start)

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