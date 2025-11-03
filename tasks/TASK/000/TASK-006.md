---
title: Implement Git worktree management for agent sessions
status: todo
priority: high
---

# Description

Implement Git worktree creation and management functionality to provide isolated working environments for each agent session.

# Current State
- Basic setupWorktree call exists in agent.js
- No structured worktree management
- Agents work in shared or undefined environments

# Target Implementation
According to roadmap, agents should:
1. Create git worktree with session ID as branch name
2. Provide isolated environment for each session
3. Clean up worktrees after session completion
4. Handle worktree conflicts and errors

# Implementation Steps
1. Create worktree manager utility class
2. Implement worktree creation from cached repositories
3. Add worktree cleanup functionality
4. Implement worktree conflict handling
5. Add session-worktree lifecycle management

# Core Features
- **Worktree Creation**: Create worktrees from repositories for each session
- **Isolation**: Each session works in isolated environment
- **Branch Management**: Use session ID as branch name
- **Cleanup**: Remove worktrees after session completion
- **Error Handling**: Handle conflicts, disk space, permissions

# Technical Requirements
- Use TASK-007 (Repository Manager) for base repositories
- Use existing git.js utility for Git operations
- Support concurrent worktree operations
- Handle worktree naming conflicts
- Provide cleanup for orphaned worktrees

# Worktree Structure
```
./worktrees/
├── session-abc-123/
│   └── [project files]
├── session-def-456/
│   └── [project files]
└── session-ghi-789/
    └── [project files]
```

# API Design
```javascript
// Worktree manager interface
class WorktreeManager {
  async createWorktree(sessionId, projectName)
  async cleanupWorktree(sessionId)
  getWorktreePath(sessionId)
  async listActiveWorktrees()
  async cleanupAllWorktrees()
}
```

# Dependencies
- Requires TASK-007 (Repository Manager) for base repositories
- Uses existing git.js utility for Git operations
- Foundation for agent code execution (TASK-009)

# Verification Criteria

## Worktree Creation Tests
```bash
# 1. Test worktree creation
node -e "
const { WorktreeManager } = require('./src/utils/worktreeManager.js');
const worktreeManager = new WorktreeManager();
const path = await worktreeManager.createWorktree('session-test-123', 'test-project');
console.log('Worktree created at:', path);
"
# Expected: Worktree created at ./worktrees/session-test-123/

# 2. Test concurrent worktree creation
node -e "
const { WorktreeManager } = require('./src/utils/worktreeManager.js');
const worktreeManager = new WorktreeManager();
const promises = [
  worktreeManager.createWorktree('session-1', 'test-project'),
  worktreeManager.createWorktree('session-2', 'test-project'),
  worktreeManager.createWorktree('session-3', 'test-project')
];
const paths = await Promise.all(promises);
console.log('Created worktrees:', paths);
"
# Expected: Three separate worktrees created successfully

# 3. Test worktree cleanup
node -e "
const { WorktreeManager } = require('./src/utils/worktreeManager.js');
const worktreeManager = new WorktreeManager();
await worktreeManager.cleanupWorktree('session-test-123');
console.log('Worktree cleaned up successfully');
"
# Expected: Worktree directory removed and Git worktree deleted
```

## Manual Verification Checklist
- [ ] WorktreeManager class created in `src/utils/worktreeManager.js`
- [ ] Worktree creation works from cached repositories
- [ ] Each session gets isolated worktree environment
- [ ] Worktree cleanup removes directories and Git worktrees
- [ ] Concurrent worktree operations work without conflicts
- [ ] Error handling covers duplicate creation, missing repositories
- [ ] Worktree paths follow pattern: `./worktrees/{sessionId}`
- [ ] Branch naming uses session IDs consistently

# Success Metrics
- Worktree creation completes in under 10 seconds
- Supports at least 10 concurrent worktree operations
- Worktree cleanup removes all traces of worktrees
- No Git repository corruption during operations