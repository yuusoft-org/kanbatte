---
title: Parallelize agentStart with thread-based concurrency control

## Problem Statement
Currently, agentStart processes all ready sessions sequentially in a single loop. Different Discord threads/channels should be able to run agent sessions in parallel, while maintaining serial execution for sessions from the same thread/channel to prevent race conditions.

## Implementation Plan

### 1. Split session fetching and processing
- Keep the existing getSessionsByStatus to fetch ready sessions
- Group sessions by their associated Discord thread ID
- Process each thread group independently

### 2. Add thread tracking to agentStart
- Create a simple object variable to track which threads are currently being processed
- Structure: `const runningThreads = {}; // { threadId: true/false }`
- This prevents the same thread from running multiple sessions simultaneously

### 3. Modify the agentStart loop structure
```javascript
// In agentStart
const runningThreads = {}; // Track which threads are running

while (true) {
  // Fetch all ready sessions
  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });
  
  // Group sessions by thread
  const sessionsByThread = await groupSessionsByThread(readySessions, discordService);
  
  // Process each thread group
  for (const [threadId, sessions] of Object.entries(sessionsByThread)) {
    // Skip if this thread is already being processed
    if (runningThreads[threadId]) continue;
    
    // Mark thread as running and process in background
    runningThreads[threadId] = true;
    processThreadSessions(sessions, deps).finally(() => {
      runningThreads[threadId] = false;
    });
  }
  
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

### 4. Create helper functions
- `groupSessionsByThread(sessions, discordService)`: Groups sessions by their Discord thread ID
- `processThreadSessions(sessions, deps)`: Processes all sessions for a single thread sequentially (existing agent logic)

### 5. Handle sessions without threads
- Create a special "no-thread" key for sessions not associated with Discord threads
- These will run sequentially as a single group

## Benefits
- Parallel processing across different Discord threads/channels
- Serial processing within the same thread (prevents message order issues)
- Simple implementation without complex concurrency libraries
- Maintains backward compatibility with non-Discord sessions

## Testing Strategy
1. Create multiple sessions across different Discord threads
2. Verify parallel execution by checking timestamps
3. Confirm serial execution within same thread
4. Test edge cases (no thread, single thread, many threads)
status: todo
priority: low
---

# Description


