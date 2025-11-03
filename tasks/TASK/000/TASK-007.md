---
title: Implement agent session message processing
status: todo
priority: high
---

# Description

Implement message processing functionality for agents to interact with sessions using completion API format.

# Current State
- Agents process tasks, not sessions
- Message format based on internal event system
- Missing standardized interface with external AI agents

# Target Implementation
Enable agents to:
1. Read session messages in completion API format
2. Append messages to sessions during processing
3. Handle session status transitions
4. Process stop flags from user interruptions

# Implementation Steps
1. Create session message processor utility
2. Implement message format conversion (internal ↔ completion API)
3. Add agent message append functionality
4. Implement session status management in agent context
5. Handle stop flag processing

# Core Features
- **Message Reading**: Convert session data to completion API format
- **Message Writing**: Append agent responses to sessions
- **Status Management**: Update session status during processing
- **Stop Handling**: Process user interruption requests
- **Error Handling**: Handle message processing errors gracefully

# Technical Requirements
- Use TASK-002 (message validation) for format validation
- Use existing session DAO methods for data access
- Support real-time message streaming (future enhancement)
- Handle large message sets efficiently
- Provide clear error messages for processing failures

# Dependencies
- Requires TASK-002 (message validation) for format checking
- Requires TASK-003 (basic session commands) for session access
- Foundation for agent server implementation (TASK-010)

# Verification Criteria

## Message Reading Tests
```bash
# 1. Test message format conversion
node -e "
const { SessionMessageProcessor } = require('./src/utils/sessionMessageProcessor.js');
const processor = new SessionMessageProcessor();
const messages = await processor.getMessagesForSession('test-session-123');
console.log('Messages in completion API format:', JSON.stringify(messages, null, 2));
"
# Expected: Output in completion API format

# 2. Test empty session handling
node -e "
const { SessionMessageProcessor } = require('./src/utils/sessionMessageProcessor.js');
const processor = new SessionMessageProcessor();
const messages = await processor.getMessagesForSession('empty-session');
console.log('Empty session messages:', messages);
"
# Expected: { messages: [] } or appropriate default
```

## Manual Verification Checklist
- [ ] SessionMessageProcessor class created in `src/utils/sessionMessageProcessor.js`
- [ ] Session messages converted to completion API format correctly
- [ ] Agent messages can be appended to sessions
- [ ] Session status can be updated by agents
- [ ] Stop flag checking works for user interruptions
- [ ] Message validation applied to all outgoing messages

# Success Metrics
- Message format conversion completes in under 100ms
- Supports message sets up to 1000 messages efficiently
- Status updates are reflected immediately in database
- No message loss during processing