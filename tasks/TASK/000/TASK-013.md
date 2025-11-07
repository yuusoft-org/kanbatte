---
title: Make session append work
status: done
priority: high
---

# Description


### Commands for Agents

```bash
kanbatte session append 'session id' -m '[{...}]'
kanbatte session append 'session id' --messages '[{...}]'
# The JSON will be in the completion API messages format
```

This command is used by both users and agents. Developers will use this API to send additional messages.

#### Completion API Format

Below is an example of the completion API format:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a friendly assistant who explains things clearly."
    },
    {
      "role": "user",
      "content": "Explain quantum entanglement in simple terms."
    },
    {
      "role": "assistant",
      "content": "Quantum entanglement is when two particles become linked, so that the state of one instantly affects the other, no matter the distance between them."
    },
    {
      "role": "user",
      "content": "Can you give a real-world analogy?"
    }
  ],
}
```

# Acceptance Criteria

1. **CLI Command Support JSON Array**: The `kanbatte session append` command must accept JSON array of messages in completion API format via `-m` or `--messages` option
2. **JSON Array Validation**: Only accept JSON arrays, reject single objects or strings with clear error messages
3. **Completion API Support**: Support standard completion API message structure with all roles (system, user, assistant) and content fields

# Implement Plan

1. **Update CLI Command** ([`src/cli.js`](src/cli.js#L161-L184)):
   - Add support for `--messages` option (alias for `-m`)
   - Modify command to parse JSON array input
   - Update sessionDeps to include existing `appendSessionMessage` function from DAO

2. **Create Session Append Handler**:
   - Create new `appendSessionMessages` function in [`src/sessionCommands.js`](src/sessionCommands.js)
   - Parse JSON array input and validate completion API message structure
   - Only accept JSON arrays, reject single objects or strings with clear error messages
   - Loop through array and call existing `appendSessionMessage` for each message

3. **Verify Existing appendSessionMessage** ([`src/dao/libsqlDao.js`](src/dao/libsqlDao.js#L11-L22)):
   - Ensure it can handle message objects with any role (system, user, assistant)
   - The existing function should work as-is for individual messages

4. **Update Tests**:
   - Add tests for JSON array parsing and validation
   - Test error handling for single objects, strings, and invalid JSON
   - Test various completion API roles (system, user, assistant) in arrays
   - Test empty array handling

5. **Documentation Update**:
   - Update CLI help text to reflect JSON array-only input
   - Add examples of JSON array message usage
