---
title: Implement session append command
status: todo
priority: high
---

# Description

Implement the session append command for adding messages to sessions in completion API format.

# Target Command
```bash
kanbatte session append 'session-id' -m '[{...}]'           # Add message
kanbatte session append 'session-id' -t -m '[{...}]'        # Add message with stop flag
```

# Implementation Steps
1. Create session append command in CLI
2. Implement JSON message parsing and validation
3. Add message to session data structure
4. Handle --stop flag for agent interruption
5. Update session timestamps on message append

# Core Features
- **Message Validation**: Use TASK-007 validation utilities
- **Stop Flag Handling**: Set special flag when --stop is used
- **Session Update**: Automatically update session modified timestamp
- **Error Handling**: Clear feedback for invalid JSON or non-existent sessions

# Technical Requirements
- Parse JSON message argument safely
- Validate message format using completion API schema
- Update session data in database using event sourcing
- Return success/failure status with appropriate messages

# Dependencies
- Requires TASK-001 (database schema) for session storage
- Requires TASK-007 (message validation) for format checking
- Requires TASK-008 (basic session commands) for session access