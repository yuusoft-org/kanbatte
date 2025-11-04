---
title: Remove comments and followups & rename sessions
status: done
priority: high
---

# Description

The task requires processing the `src/commands.js` file. First, remove all logic related to comments and followups. Then rename all instances of "task" to "session" throughout the file to distinguish from the task concepts in `src/taskCommands.js`.

**Important:** Projects are completely unrelated to task types. Each session needs to be attached to a project because the project contains the git repository information.

# Acceptance Criteria

1. Remove `addComment` function from `src/commands.js`
2. Remove `addFollowup` function from `src/commands.js`
3. Rename `addTask` function to `addSession`
4. Rename `updateTask` function to `updateSession`
5. Rename `readTask` function to `readSession`
6. Rename `listTasks` function to `listSessions`
7. Update all function references to use "session" terminology instead of "task"
8. Update all error messages and console logs to refer to "sessions" instead of "tasks"
9. Update all variable names and data structures to use "session" terminology
10. Ensure the functionality remains the same but with session terminology

# Implement Plan

1. Remove comment-related functions:
   - Delete `addComment` function (lines 56-100)
   - Delete `addFollowup` function (lines 158-202)

2. Rename task-related functions to session functions:
   - `addTask` → `addSession`
   - `updateTask` → `updateSession`
   - `readTask` → `readSession`
   - `listTasks` → `listSessions`

3. Update terminology throughout the file:
   - Replace all "task" references with "session" in function names
   - Update error messages and console logs
   - Update variable names and data structure references
   - Update event types from "task_created" to "session_created", etc.

4. Update DAO calls:
   - Change `getViewByTaskId` to `getViewBySessionId` (if method exists)
   - Update `getNextTaskNumber` to `getNextSessionNumber` (if method exists)
   - Ensure all database operations use session terminology

5. Briefly verify session logic aligns with roadmap:
   - Current functions seem to align conceptually with roadmap session commands
   - Note: CLI commands not yet implemented, just checking basic structure

6. Rename file:
   - Rename `src/commands.js` to `src/sessionCommands.js` to clearly separate session functionality from task functionality in `src/taskCommands.js`

7. Test the changes:
   - Verify all functions compile correctly
   - Check that error messages are updated
   - Update any imports/references to the renamed file if they exist
