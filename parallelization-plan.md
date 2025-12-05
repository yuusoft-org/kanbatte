# Parallelization Plan for agent.js agentStart

## Executive Summary
This plan outlines how to parallelize the agent.js `agentStart` function to allow different Discord threads/channels to run in parallel while maintaining serial execution for sessions within the same thread/channel.

## Current State Analysis

### Existing Implementation
- **Sequential Processing**: All sessions are processed one by one in a for loop
- **No Concurrency**: Even sessions from different threads wait for each other
- **Polling Interval**: 5-second delay between polling cycles
- **Status Flow**: ready → in-progress → review

### Key Components
1. `agent.js`: Main agent processing logic
2. `sessionService`: Manages session state and persistence
3. `discordService`: Handles Discord thread-to-session mapping
4. Git worktree management for isolated environments

## Proposed Solution

### Architecture Overview
Implement a **Thread-Based Concurrency Model** with the following characteristics:
- Multiple sessions from different threads can run in parallel
- Sessions from the same thread are processed serially (FIFO)
- Maximum concurrent executions limit to prevent resource exhaustion

### Implementation Design

#### 1. Thread Lock Manager
Create a `ThreadLockManager` class to track which threads are currently processing:

```javascript
class ThreadLockManager {
  constructor(maxConcurrent = 5) {
    this.locks = new Map(); // threadId -> Promise
    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
  }

  async acquireLock(threadId) {
    // Wait if max concurrent reached
    while (this.activeCount >= this.maxConcurrent) {
      await this.waitForAvailableSlot();
    }

    // Wait for same thread to be free
    if (this.locks.has(threadId)) {
      await this.locks.get(threadId);
    }

    // Create new lock for this thread
    let releaseLock;
    const lockPromise = new Promise(resolve => {
      releaseLock = resolve;
    });

    this.locks.set(threadId, lockPromise);
    this.activeCount++;

    return releaseLock;
  }

  releaseLock(threadId, releaseLock) {
    releaseLock();
    this.locks.delete(threadId);
    this.activeCount--;
  }
}
```

#### 2. Enhanced Session Processing
Modify the agent function to support parallel processing:

```javascript
export const agent = async (deps) => {
  const { sessionService, discordService } = deps;
  const threadLockManager = new ThreadLockManager(5); // Max 5 concurrent

  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

  // Group sessions by thread
  const sessionsByThread = await groupSessionsByThread(readySessions, discordService);

  // Process threads in parallel
  const promises = [];
  for (const [threadId, sessions] of sessionsByThread.entries()) {
    const promise = processThreadSessions(threadId, sessions, deps, threadLockManager);
    promises.push(promise);
  }

  await Promise.all(promises);
};

async function processThreadSessions(threadId, sessions, deps, lockManager) {
  const releaseLock = await lockManager.acquireLock(threadId);

  try {
    // Process sessions for this thread serially
    for (const session of sessions) {
      await processSingleSession(session, deps);
    }
  } finally {
    lockManager.releaseLock(threadId, releaseLock);
  }
}
```

#### 3. Session Grouping Logic
Implement logic to group sessions by their Discord thread:

```javascript
async function groupSessionsByThread(sessions, discordService) {
  const sessionsByThread = new Map();

  for (const session of sessions) {
    const threadId = await discordService.getThreadIdBySession({
      sessionId: session.sessionId
    });

    // Use 'no-thread' for sessions without Discord threads
    const key = threadId || 'no-thread';

    if (!sessionsByThread.has(key)) {
      sessionsByThread.set(key, []);
    }
    sessionsByThread.get(key).push(session);
  }

  return sessionsByThread;
}
```

#### 4. Error Handling and Recovery
Enhance error handling to prevent one thread's failure from affecting others:

```javascript
async function processSingleSession(session, deps) {
  const { sessionService } = deps;

  try {
    await sessionService.updateSessionStatus({
      sessionId: session.sessionId,
      status: "in-progress"
    });

    // ... existing processing logic ...

  } catch (error) {
    console.error(`Error processing session ${session.sessionId}:`, error);

    // Mark session as failed or ready for retry
    await sessionService.updateSessionStatus({
      sessionId: session.sessionId,
      status: "error"
    });
  } finally {
    // Always ensure status is updated
    const currentStatus = await sessionService.getViewBySessionId({
      sessionId: session.sessionId
    });

    if (currentStatus.status === "in-progress") {
      await sessionService.updateSessionStatus({
        sessionId: session.sessionId,
        status: "review"
      });
    }
  }
}
```

### Configuration Options

Add configuration for parallelization behavior:

```javascript
const PARALLEL_CONFIG = {
  maxConcurrentThreads: parseInt(process.env.MAX_CONCURRENT_THREADS || '5'),
  maxSessionsPerThread: parseInt(process.env.MAX_SESSIONS_PER_THREAD || '10'),
  enableParallelization: process.env.ENABLE_PARALLEL === 'true',
  threadTimeoutMs: parseInt(process.env.THREAD_TIMEOUT_MS || '600000'), // 10 minutes
};
```

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)
1. Create `ThreadLockManager` class
2. Implement session grouping by thread
3. Add configuration management
4. Create unit tests for lock manager

### Phase 2: Agent Integration (Week 2)
1. Refactor agent.js to use ThreadLockManager
2. Modify session processing to support parallel execution
3. Add comprehensive error handling
4. Implement timeout mechanism

### Phase 3: Monitoring & Optimization (Week 3)
1. Add logging for concurrent execution tracking
2. Implement metrics collection
3. Add health checks for stuck threads
4. Performance testing and optimization

### Phase 4: Deployment & Testing (Week 4)
1. Feature flag implementation
2. Gradual rollout strategy
3. Load testing with multiple concurrent threads
4. Documentation and training

## Testing Strategy

### Unit Tests
- ThreadLockManager functionality
- Session grouping logic
- Error handling scenarios

### Integration Tests
- Multiple threads processing simultaneously
- Serial processing within same thread
- Resource limit enforcement
- Error recovery mechanisms

### Performance Tests
- Throughput comparison (sequential vs parallel)
- Resource usage monitoring
- Stress testing with high session volume

## Monitoring & Observability

### Metrics to Track
- Sessions processed per minute
- Average processing time per session
- Concurrent threads active
- Queue depths per thread
- Error rates by thread

### Logging Enhancements
```javascript
console.log({
  type: 'session_processing',
  sessionId: session.sessionId,
  threadId: threadId,
  concurrentThreads: lockManager.activeCount,
  timestamp: Date.now()
});
```

## Risk Mitigation

### Potential Issues & Solutions

1. **Resource Exhaustion**
   - Solution: Configurable concurrency limits
   - Monitoring: CPU/Memory usage alerts

2. **Thread Deadlocks**
   - Solution: Timeout mechanism for locks
   - Recovery: Automatic lock release after timeout

3. **Data Race Conditions**
   - Solution: Proper isolation with git worktrees
   - Validation: Session state consistency checks

4. **Cascading Failures**
   - Solution: Circuit breaker pattern
   - Recovery: Graceful degradation to sequential mode

## Success Criteria

1. **Performance**: 3-5x improvement in throughput for multi-thread scenarios
2. **Reliability**: No increase in error rate
3. **Resource Usage**: < 20% increase in CPU/memory usage
4. **Backward Compatibility**: Feature flag to disable parallelization

## Rollback Plan

If issues arise:
1. Set `ENABLE_PARALLEL=false` environment variable
2. System reverts to sequential processing
3. All in-progress parallel sessions complete
4. No data loss or corruption

## Future Enhancements

1. **Dynamic Scaling**: Adjust concurrency based on system load
2. **Priority Queues**: High-priority threads get processed first
3. **Distributed Processing**: Multiple agent instances with coordination
4. **Smart Batching**: Group related sessions for efficiency
5. **Pre-emptive Processing**: Start processing before status changes to "ready"