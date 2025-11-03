---
title: Implement agent server startup command
status: todo
priority: high
---

# Description

Implement the agent server startup command that manages the continuous agent processing loop according to roadmap specifications.

# Current State
- Basic `kanbatte agent` command exists in cli.js
- Agent processes tasks instead of sessions
- No continuous loop or session polling
- Missing integration with Git workspace management

# Target Implementation
According to roadmap, implement:
```bash
kanbatte agent start
```

Agent should run in continuous loop:
1. Check all sessions with 'ready' status
2. Pick the first session:
   - Ensure repository downloaded in `./repositories` folder
   - Create git worktree with session ID as branch name
   - Start coding agent in worktree:
     - Set session status to 'in-progress'
     - Listen to agent updates and send to database
     - Set session status to 'review' when complete

# Implementation Steps
1. Update existing agent command to `agent start`
2. Implement session polling loop
3. Integrate with repository management (TASK-007)
4. Integrate with worktree management (TASK-008)
5. Integrate with message processing (TASK-009)
6. Add session lifecycle management
7. Implement graceful shutdown

# Core Features
- **Session Polling**: Continuously check for ready sessions
- **Workspace Setup**: Automatic repository download and worktree creation
- **Agent Execution**: Run AI agents in isolated environments
- **Status Management**: Update session status throughout processing
- **Message Handling**: Process agent messages and updates
- **Cleanup**: Clean up worktrees after completion

# Technical Requirements
- Use TASK-007 (Repository Manager) for repository handling
- Use TASK-008 (Worktree Manager) for workspace management
- Use TASK-009 (Message Processor) for agent communication
- Support concurrent session processing (future enhancement)
- Handle agent failures and recovery
- Provide logging and monitoring

# Agent Loop Architecture
```javascript
// Agent server main loop
class AgentServer {
  async start()
  async pollForReadySessions()
  async processSession(sessionId)
  async setupWorkspace(sessionId, projectName)
  async executeAgent(sessionId, worktreePath)
  async cleanupSession(sessionId)
}
```

# Dependencies
- Requires TASK-007 (Repository Manager) for repository setup
- Requires TASK-008 (Worktree Manager) for workspace creation
- Requires TASK-009 (Message Processor) for agent communication
- Integration with external AI agent SDK

# Verification Criteria

## Agent Startup Tests
```bash
# 1. Test agent server startup
kanbatte agent start
# Expected: Agent server starts, begins polling for ready sessions
# Press Ctrl+C to stop

# 2. Test agent with no ready sessions
# Create a session with status 'done'
kanbatte agent start
# Expected: Agent starts but finds no ready sessions, continues polling
```

## Session Processing Tests
```bash
# 3. Test end-to-end session processing
# Create a ready session
kanbatte session queue -p test-project "Analyze the codebase and suggest improvements"

# Start agent server
kanbatte agent start
# Expected:
# - Agent finds ready session
# - Downloads repository to ./repositories/test-project/
# - Creates worktree at ./worktrees/{session-id}/
# - Sets session status to 'in-progress'
# - Starts processing with AI agent
# - Updates session with agent responses
# - Sets status to 'review' when complete
# - Cleans up worktree

# 4. Verify session completion
kanbatte session view {session-id}
# Expected: Session shows 'review' status with agent messages
```

## Error Handling Tests
```bash
# 5. Test invalid repository handling
# Create session for project with invalid Git URL
kanbatte session queue -p invalid-project "Test invalid repo"
kanbatte agent start
# Expected: Agent handles repository errors gracefully, updates session with error message

# 6. Test agent failure handling
# Simulate agent failure during processing
# Expected: Session status updated to reflect failure, error messages logged
```

## Manual Verification Checklist
- [ ] Agent server starts with `kanbatte agent start` command
- [ ] Continuous polling loop checks for ready sessions
- [ ] Repository download works for session projects
- [ ] Worktree creation uses session ID as branch name
- [ ] Session status transitions correctly (ready → in-progress → review)
- [ ] Agent messages are processed and stored in sessions
- [ ] Worktree cleanup happens after session completion
- [ ] Error handling covers repository, worktree, and agent failures
- [ ] Logging provides clear visibility into agent operations
- [ ] Graceful shutdown handles interrupt signals

# Performance Tests
```bash
# 7. Test concurrent session handling
# Create multiple ready sessions
kanbatte session queue -p project-a "Task A"
kanbatte session queue -p project-b "Task B"
kanbatte session queue -p project-c "Task C"

kanbatte agent start
# Expected: Agent processes sessions sequentially (for now)
# Future enhancement: Support concurrent processing
```

# Success Metrics
- Agent server startup completes in under 5 seconds
- Session processing begins within 10 seconds of readiness
- Repository and worktree setup completes in under 30 seconds
- Agent can process at least 1 session per minute (depends on complexity)
- Memory usage remains stable during continuous operation
- Error recovery works without manual intervention
- Graceful shutdown completes within 5 seconds