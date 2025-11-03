---
title: Implement completion API message format validation
status: todo
priority: high
---

# Description

Implement validation for the completion API message format used in session interactions.

# Current State
- Custom event format for tasks, comments, followups
- No standardized message format validation
- Mixed data structures across different event types

# Target Format
Implement standard completion API message format:
```json
{
  "messages": [
    {
      "role": "system|user|assistant",
      "content": "message content"
    }
  ]
}
```

# Implementation Steps
1. Create message validation utility functions
2. Add role validation (system, user, assistant)
3. Implement JSON parsing and validation
4. Add error handling for invalid message formats
5. Create unit tests for message validation

# Technical Requirements
- Strict validation of message role field
- Proper JSON parsing with meaningful error messages
- Support for empty messages array
- Handle malformed JSON gracefully

# Integration Points
- Will be used by session append command
- Required by agent message processing
- Foundation for all session-based interactions

# Verification Criteria

## Unit Tests
```bash
# 1. Test valid message format
node -e "
const { validateMessage } = require('./src/utils/messageValidation.js');
const validMessage = JSON.stringify({
  messages: [{ role: 'user', content: 'Hello' }]
});
console.log(validateMessage(validMessage)); // Expected: true
"
# Expected: Validation passes, returns true

# 2. Test invalid role
node -e "
const { validateMessage } = require('./src/utils/messageValidation.js');
const invalidMessage = JSON.stringify({
  messages: [{ role: 'invalid', content: 'Hello' }]
});
console.log(validateMessage(invalidMessage)); // Expected: throws error
"
# Expected: Throws error with descriptive message about invalid role

# 3. Test malformed JSON
node -e "
const { validateMessage } = require('./src/utils/messageValidation.js');
try {
  validateMessage('invalid json');
} catch (error) {
  console.log(error.message); // Expected: Clear JSON parsing error
}
"
# Expected: Throws error with JSON parsing details

# 4. Test empty messages array
node -e "
const { validateMessage } = require('./src/utils/messageValidation.js');
const emptyMessage = JSON.stringify({ messages: [] });
console.log(validateMessage(emptyMessage)); // Expected: true
"
# Expected: Validation passes for empty messages
```

## Integration Tests
```bash
# 5. Test with session append command (after TASK-009)
kanbatte session append 'test-session' -m '{"messages": [{"role": "user", "content": "test"}]}'
# Expected: Command succeeds, message accepted

# 6. Test invalid format in session append
kanbatte session append 'test-session' -m '{"messages": [{"role": "invalid", "content": "test"}]}'
# Expected: Command fails with clear error message about invalid role
```

## Manual Verification Checklist
- [ ] Validation utility created in `src/utils/messageValidation.js`
- [ ] Function validates JSON format correctly
- [ ] Function validates role field (only: system, user, assistant)
- [ ] Function validates content field is string
- [ ] Function handles empty messages array
- [ ] Error messages are descriptive and helpful
- [ ] Performance: validation completes in <10ms for typical messages
- [ ] Code coverage: unit tests cover all validation paths
- [ ] Integration with session commands works correctly

## Test Cases to Implement
```javascript
// Valid cases
✓ { messages: [{ role: "user", content: "Hello" }] }
✓ { messages: [{ role: "system", content: "You are helpful" }] }
✓ { messages: [{ role: "assistant", content: "I can help" }] }
✓ { messages: [] } // Empty array allowed
✓ { messages: [
    { role: "system", content: "System message" },
    { role: "user", content: "User message" },
    { role: "assistant", content: "Assistant response" }
  ]}

// Invalid cases
✗ Missing messages field
✗ Invalid role values
✗ Non-string content
✗ Malformed JSON
✗ Messages is not an array
✗ Message object missing role or content
```

## Success Metrics
- All unit tests pass (100% code coverage)
- Validation handles edge cases gracefully
- Error messages are actionable for developers
- No performance impact on session operations
- Integration with session commands works seamlessly