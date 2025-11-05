---
title: Incrementally reorganize task system - preserve working components, adapt session logic progressively
status: done
priority: high
---

# Description

Based on roadmap migration guidance "rename task to session, remove comments and followups, can keep projects, but need to update the cli, can keep current folder and files structure", perform an incremental reorganization of the current task system.

**Key Principle**: Preserve all working components and adapt them progressively rather than wholesale deletion. This avoids "double work" and maintains system functionality.

**Important**: This is about identifying which parts should be adapted vs which need fundamental changes, while preserving the maximum amount of working code.

# Acceptance Criteria

1. **Preserve Working Components**:
   - Keep `sessionCommands.js` but adapt its data structure progressively
   - Keep `utils/git.js` and `utils/output.js` - they are valuable utilities
   - Keep `agent/agent.js` - it provides core AI functionality
   - Keep project management functionality as-is

2. **Adapt Session Data Structure**:
   - Modify `sessionCommands.js` to use correct session data structure
   - Update data from task-like (title/description) to session-like (messages)
   - Maintain existing function signatures where possible
   - Update related database operations progressively

3. **Update CLI Progressively**:
   - Adapt existing commands rather than delete them
   - Update command names and descriptions where needed
   - Maintain command group structure
   - Update imports and references incrementally

4. **Preserve Database Patterns**:
   - Keep existing database schema and query patterns
   - Adapt event handling to new session structure
   - Maintain backward compatibility during transition

# Implement Plan

1. **Analyze Existing Session Components**:
   - Review `sessionCommands.js` for adaptation opportunities
   - Identify which functions need data structure changes vs simple renames
   - Assess `utils/git.js`, `utils/output.js` for current usability

2. **Adapt Session Data Structure**:
   - Modify `sessionCommands.js` functions to handle session data properly
   - Update data structures from task format to session format
   - Ensure proper handling of messages array vs title/description

3. **Update Database Layer Incrementally**:
   - Adapt `libsqlDao.js` to handle both old and new session formats during transition
   - Update event handling progressively
   - Maintain database query patterns

4. **Adapt CLI Commands**:
   - Update command names and descriptions where needed
   - Keep existing command structure (taskCmd, newCmd, etc.)
   - Update imports and function calls

5. **Adapt Supporting Components**:
   - Update `agent/agent.js` to work with adapted session structure
   - Ensure `utils/git.js` and `utils/output.js` remain functional
   - Update cross-component references

6. **Test Progressive Functionality**:
   - Verify each adapted component works with new session structure
   - Ensure CLI commands remain functional during transition
   - Validate that existing project functionality still works

