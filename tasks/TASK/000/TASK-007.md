---
title: Make libsqlDao.js conform to roadmap session specification
status: todo
priority: high
---

# Description

Currently `src/dao/libsqlDao.js` has been renamed to use session terminology but still uses task-like data structure (title + description). According to roadmap, sessions should have a completely different data structure focused on AI message interactions.

Update `libsqlDao.js` to implement the correct session data structure as specified in the roadmap:

```js
session.id
session.project
session.messages    // AI conversation history (completion API format)
session.status       // ready, in-progress, review, done
session.createdAt
session.updatedAt
```

**Important**: This is about updating the data structure and event handling logic, not adding new features. Only reorganize existing logic to use the correct session structure.

# Acceptance Criteria

1. **Update session data structure**:
   - Remove `title` and `description` fields from session state
   - Add `messages` array field for conversation history
   - Add `createdAt` and `updatedAt` timestamp fields
   - Keep `sessionId`, `projectId`, and `status` fields

2. **Update event handling**:
   - Modify `session_created` event to populate correct session structure
   - Modify `session_updated` event to handle session-appropriate updates
   - Ensure proper handling of messages array in events

# Implement Plan

1. **Update session state initialization**:
   - Modify default session state in `computeAndSaveView` function
   - Remove `title` and `description` fields
   - Add `messages` array (initialized empty)
   - Add `createdAt` and `updatedAt` fields

2. **Update session_created event handling**:
   - Ensure `session_created` events populate correct session structure
   - Handle initial message in conversation (if provided)
   - Set proper timestamps

3. **Update session_updated event handling**:
   - Handle updates to messages array
   - Handle status changes with proper timestamps
   - Ensure `updatedAt` is always updated

4. **Review all session-related functions**:
   - Verify that `getViewBySessionId`, `getSessionsByStatus`, etc. work with new structure
   - Ensure database queries and view key patterns remain functional

