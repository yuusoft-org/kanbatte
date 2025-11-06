---
title: Fix agent command structure to support 'agent start'
status: todo
priority: high
assignee:
---

# Description

Currently the CLI only supports `kanbatte agent` but the roadmap specifies `kanbatte agent start`. This is a critical blocking issue that prevents testing the agent functionality. This task fixes the command structure immediately.

# Current Issues

1. **Wrong command structure**: `bun src/cli.js agent start` fails with "too many arguments"
2. **Missing subcommand support**: Agent command is not a command group
3. **Blocking testing**: Cannot test any agent functionality without proper command structure

# Acceptance Criteria

1. [ ] `bun src/cli.js agent start` works without errors
2. [ ] `bun src/cli.js agent` shows help with available subcommands
3. [ ] `bun src/cli.js agent --help` shows detailed help
4. [ ] Agent functionality is identical to current behavior
5. [ ] No breaking changes to existing agent logic

# Implementation Plan

## Update CLI Structure

1. **Convert agent to command group**:
   - Change from direct command to command group
   - Add `start` subcommand with existing functionality
   - This is a simple structural change, no agent logic changes needed

## Implementation

```javascript
// In src/cli.js, replace current agent command (lines 329-349):

// Agent command group
const agentCmd = program.command("agent").description("Control AI agents");

agentCmd
  .command("start")
  .description("Start agent to process ready sessions")
  .action(async () => {
    const agentDeps = {
      libsqlDao: {
        getSessionsByStatus: (status) => {
          return libsqlDao.getSessionsByStatus(libsqlDaoDeps, status);
        },
        getViewBySessionId: (sessionId) => {
          return libsqlDao.getViewBySessionId(libsqlDaoDeps, sessionId);
        },
        updateSession: (deps, payload) => {
          return updateSession(deps, payload);
        },
      },
    };
    await agent(agentDeps);
  });
```

# Files to Modify

- `src/cli.js` - Convert agent command to command group (lines 329-349)
- `src/agent/agent.js` - Add error handling to always set status to "review" even on AI failures

# Testing

## Test Steps

1. **Test help commands**:
   ```bash
   bun src/cli.js agent --help
   bun src/cli.js agent
   ```
   *Expected: Shows help with "start" subcommand listed*

2. **Test agent start**:
   ```bash
   # First create a test project and session
   bun src/cli.js db setup
   bun src/cli.js session project create -p vv-bot -n "VV Bot" -r git@github.com:738NGX/vv-bot.git
   bun src/cli.js session queue -p vv-bot "How the project work?"

   # Then test agent start
   bun src/cli.js agent start
   ```
   *Expected: Agent starts and processes the ready session*

3. **Test error cases**:
   ```bash
   bun src/cli.js agent invalid
   ```
   *Expected: Shows appropriate error message*

## Error Handling Note

Add error handling in agent.js to always mark sessions as "review" even when AI processing fails, simulating successful completion. This can be easily modified later to set status back to "ready" or throw errors as needed when full AI support is implemented.