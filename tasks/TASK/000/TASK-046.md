---
title: Simple parallelization of agentStart for multi-thread processing
status: todo
priority: low
---

## Problem
agentStart processes all sessions sequentially. Different Discord threads should run in parallel while keeping same-thread sessions serial.

## Solution - Minimal Changes

### 1. Add thread tracking object in agentStart
```javascript
const runningThreads = {}; // Track which threads are processing
```

### 2. Split session fetching and processing
- Keep getSessionsByStatus to fetch sessions
- Group by thread ID
- Process each thread group independently

### 3. Key code changes in agent.js:
```javascript
// In agentStart function
const runningThreads = {};

while (true) {
  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

  // Group sessions by Discord thread
  const sessionsByThread = {};
  for (const session of readySessions) {
    const threadId = await getThreadId(session, discordService);
    if (!sessionsByThread[threadId]) sessionsByThread[threadId] = [];
    sessionsByThread[threadId].push(session);
  }

  // Process each thread's sessions
  for (const [threadId, sessions] of Object.entries(sessionsByThread)) {
    if (runningThreads[threadId]) continue; // Skip if already running

    runningThreads[threadId] = true;
    processThreadSessions(sessions, deps).finally(() => {
      delete runningThreads[threadId];
    });
  }

  await new Promise(r => setTimeout(r, 5000));
}
```

### 4. Add helper function to process thread sessions
```javascript
async function processThreadSessions(sessions, deps) {
  for (const session of sessions) {
    // Existing session processing logic
    await processSession(session, deps);
  }
}
```

## Benefits
- Different threads run in parallel
- Same thread stays serial (no race conditions)
- Super simple - just an object to track running threads
- No complex libraries or major refactoring
