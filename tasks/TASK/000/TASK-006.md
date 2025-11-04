---
title: Thoroughly reorganize old task system
status: todo
priority: high
---

# Description

Based on roadmap migration guidance "rename task to session, remove comments and followups, can keep projects, but need to update the cli, can keep current folder and files structure", perform a thorough reorganization of the current task system.

**Important**: This is about identifying which parts of the existing task system should be renamed to session (because they serve session purposes) vs which should be deleted (because they're no longer needed) vs which should remain as task functionality.

**Critical rule**: Absolutely no new logic should be added. Only reorganize existing logic.

# Acceptance Criteria

1. **Identify and categorize all current task system components**:
   - Components that should remain as "task" functionality (git markdown file management)
   - Components that should be renamed to "session" functionality (database AI interaction records)
   - Components that should be deleted (no longer needed per roadmap)

2. **Execute proper reorganization**:
   - Keep task-related files that handle git markdown tasks
   - Rename appropriate database task logic to session terminology
   - Delete components that are no longer needed according to roadmap


4. **No new logic**:
   - Do not add new session functionality
   - Do not add new data structures
   - Only reorganize and rename existing logic

# Implement Plan

1. **Analyze current task system components**:
   - `taskCommands.js` + `utils/tasks.js` - git markdown task management → KEEP as task
   - `dao/libsqlDao.js` - database layer → REVIEW for task vs session functions
   - `utils/output.js` - output formatting → REVIEW for session-specific formatting
   - `utils/git.js` - git worktree management → KEEP (needed for agent worktrees)
   - `agent/agent.js` - AI agent → REVIEW for session dependencies
   - `cli.js` - CLI commands → REVIEW for session vs task commands

2. **Identify session functionality in existing code**:
   - Look for database operations that should be session (AI interactions) rather than task (file management)
   - Look for CLI commands that handle session-style operations
   - Look for database functions that handle AI agent interactions

3. **Check utils directory for necessity**:
   - Review all files in `src/utils/` to determine if they're still needed
   - Delete any utility files that are no longer used by the remaining codebase
   - Update any imports to remove references to deleted utils files

4. **Execute reorganization**:
   - Rename database task functions to session terminology where appropriate
   - Update CLI commands to reflect task vs session distinction
   - Update imports and references to use correct terminology
   - Remove any remaining task-like logic that should be session-specific

