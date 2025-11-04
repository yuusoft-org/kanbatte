---
title: dependency inject fs
status: todo
assignee: aditya
priority: low
---

# Description

## Problem

currently in `src/utils/tasks.js` it is importing `fs` library directy. This does not allow us to dependency inejct it for testing.

## Solution

- `fs` should be imported in `src/cli.js` and added to `deps`
- `deps`  should be passed down to `src/taskCommands.js`
- in `src/taskCommands.js`, we can access `fs` from `deps.fs`
  - when we need a util to access `fs`, we need to pass deps to that function. for example taskExists(deps, filepath)
- in the end, there should be no direct import of `fs` in `src/utils/tasks.js`

## Test plan

Make sure the existing task related cli commands still work

## Implementation plan

### Step 1: Add fs to deps in src/cli.js

**File:** `src/cli.js`

**Changes:**
1. Import `fs` module at the top:
   ```javascript
   import * as fs from "fs";
   ```

2. Add `fs` to the `commandsDeps` object (around line 49):
   ```javascript
   const commandsDeps = {
     fs,  // Add this line
     serialize,
     deserialize,
     generateId,
     formatOutput,
     libsqlDao: { ... }
   };
   ```

---

### Step 2: Update task command function signatures in src/taskCommands.js

**File:** `src/taskCommands.js`

**Changes:**
1. Remove direct fs imports at the top (lines 3):
   ```javascript
   // REMOVE: import { writeFileSync, existsSync } from "fs";
   ```

2. Update `createTask()` function signature (line 23):
   ```javascript
   // FROM: export function createTask(projectRoot, options)
   // TO:   export function createTask(deps, projectRoot, options)
   ```

3. Update `listTasks()` function signature (line 62):
   ```javascript
   // FROM: export function listTasks(projectRoot, options = {})
   // TO:   export function listTasks(deps, projectRoot, options = {})
   ```

4. Update `locateTask()` function signature (line 84):
   ```javascript
   // FROM: export function locateTask(projectRoot, taskId)
   // TO:   export function locateTask(deps, projectRoot, taskId)
   ```

5. Update all calls to utility functions to pass `deps` as the first parameter:
   - Line 44: `getNextTaskId(deps, projectRoot, type)`
   - Line 47: `createTaskFolders(deps, projectRoot, type, folder)`
   - Line 54: `deps.fs.writeFileSync(filePath, content, "utf8")`
   - Line 66: `scanTaskFiles(deps, projectRoot, type)`
   - Line 89: `taskExists(deps, filePath)`

---

### Step 3: Update utility function signatures in src/utils/tasks.js

**File:** `src/utils/tasks.js`

**Changes:**
1. Remove direct fs imports at the top (line 3):
   ```javascript
   // REMOVE: import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
   ```

2. Update function signatures to accept `deps` as the first parameter and use `deps.fs`:

   **createTaskFolders()** (line 27):
   ```javascript
   // FROM: export function createTaskFolders(basePath, type, folderName)
   // TO:   export function createTaskFolders(deps, basePath, type, folderName)
   ```
   - Line 32: `deps.fs.existsSync(taskTypePath)`
   - Line 33: `deps.fs.mkdirSync(taskTypePath, { recursive: true })`
   - Line 36: `deps.fs.existsSync(folderPath)`
   - Line 37: `deps.fs.mkdirSync(folderPath, { recursive: true })`

   **getNextTaskId()** (line 45):
   ```javascript
   // FROM: export function getNextTaskId(basePath, type)
   // TO:   export function getNextTaskId(deps, basePath, type)
   ```
   - Line 49: `deps.fs.existsSync(taskTypePath)`
   - Line 54: `deps.fs.readdirSync(taskTypePath, { withFileTypes: true })`
   - Line 62: `deps.fs.readdirSync(folderPath)`

   **parseTaskFile()** (line 121):
   ```javascript
   // FROM: export function parseTaskFile(filePath)
   // TO:   export function parseTaskFile(deps, filePath)
   ```
   - Line 122: `deps.fs.readFileSync(filePath, "utf8")`

   **scanTaskFiles()** (line 148):
   ```javascript
   // FROM: export function scanTaskFiles(basePath, typeFilter = null)
   // TO:   export function scanTaskFiles(deps, basePath, typeFilter = null)
   ```
   - Line 153: `deps.fs.existsSync(tasksPath)`
   - Line 162: `deps.fs.existsSync(typePath)`
   - Line 167: `deps.fs.readdirSync(tasksPath, { withFileTypes: true })`
   - Line 177: `deps.fs.readdirSync(typePath, { withFileTypes: true })`
   - Line 185: `deps.fs.readdirSync(folderPath)`
   - Line 191: `parseTaskFile(deps, filePath)` (pass deps to parseTaskFile)

   **taskExists()** (line 307):
   ```javascript
   // FROM: export function taskExists(filePath)
   // TO:   export function taskExists(deps, filePath)
   ```
   - Line 308: `return deps.fs.existsSync(filePath);`

**Note:** Functions that don't use fs don't need to be updated:
- `formatPriority()` - no fs usage
- `generateTaskContent()` - no fs usage
- `filterByStatus()` - no fs usage
- `filterByPriority()` - no fs usage
- `formatTaskTable()` - no fs usage
- `parseTaskId()` - no fs usage
- `calculateFolder()` - no fs usage
- `buildTaskPath()` - no fs usage (just path manipulation)

---

### Step 4: Update function calls in src/cli.js

**File:** `src/cli.js`

**Changes:**
Update all task command calls to pass `deps` as the first parameter:

1. Line 192-193 (task create command):
   ```javascript
   // FROM: const result = createTask(projectRoot, { type, ...options });
   // TO:   const result = createTask(commandsDeps, projectRoot, { type, ...options });
   ```

2. Line 208 (task list command):
   ```javascript
   // FROM: const result = listTasks(projectRoot, { type, ...options });
   // TO:   const result = listTasks(commandsDeps, projectRoot, { type, ...options });
   ```

3. Line 219 (task locate command):
   ```javascript
   // FROM: const path = locateTask(projectRoot, taskId);
   // TO:   const path = locateTask(commandsDeps, projectRoot, taskId);
   ```

---

### Step 5: Verification

After implementation:

1. Verify no direct `fs` imports remain in:
   - `src/taskCommands.js`
   - `src/utils/tasks.js`

2. Test all task commands:
   ```bash
   bun run cli.js task create TASK -t "Test task"
   bun run cli.js task list
   bun run cli.js task locate TASK-001
   ```

3. Ensure all commands work as expected with the dependency injection pattern.

---

### Summary of Changes

**Files Modified:** 3
- `src/cli.js` - Add fs to deps, pass deps to task commands
- `src/taskCommands.js` - Accept deps, remove fs import, pass deps to utilities
- `src/utils/tasks.js` - Accept deps in functions that use fs, use deps.fs

**Functions Updated:** 8
- `createTask()` - Accept deps
- `listTasks()` - Accept deps
- `locateTask()` - Accept deps
- `createTaskFolders()` - Accept deps, use deps.fs
- `getNextTaskId()` - Accept deps, use deps.fs
- `parseTaskFile()` - Accept deps, use deps.fs
- `scanTaskFiles()` - Accept deps, use deps.fs
- `taskExists()` - Accept deps, use deps.fs

