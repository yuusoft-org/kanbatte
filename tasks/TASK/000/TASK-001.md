---
title: Update database schema for session support
status: todo
priority: high
---

# Description

Update the database schema to support session-based architecture as the foundation for session management.

# Current State
- Event log table stores task/comment/followup events
- View table stores computed views for current entities
- No session-specific data structures

# Target Schema
Add support for session events and session views:
- Session creation events: `session_created`
- Session message events: `session_append`
- Session status events: `session_status_update`
- Session views: `session:{sessionId}`

# Implementation Steps
1. Create new migration file for session support
2. Add session event type definitions
3. Update event processing logic to handle session events
4. Test session data creation and retrieval

# Technical Requirements
- Maintain existing event sourcing architecture
- Session data stored in view table: session:{sessionId}
- Focus purely on session implementation
- No need to maintain existing task functionality

# Verification Criteria

## Database Migration Tests
```bash
# 1. Migration runs successfully
kanbatte db setup
# Expected: No errors, migration applied successfully

# 2. Check migration status
sqlite3 local.db "SELECT * FROM umzug_meta;"
# Expected: Session migration appears as executed

# 3. Verify table structure
sqlite3 local.db ".schema event_log"
sqlite3 local.db ".schema view"
# Expected: Tables exist with correct structure
```

## Session Data Creation Tests
```bash
# 4. Create session event via database
sqlite3 local.db "INSERT INTO event_log (id, key, data, created_at) VALUES ('test-1', 'session:test-1', X'...', $(date +%s));"
# Expected: No errors, event created successfully

# 5. Verify session view computation
sqlite3 local.db "SELECT * FROM view WHERE key = 'session:test-1';"
# Expected: Session view created with proper data structure
```

## Session Functionality Tests
```bash
# 6. Test session event creation through application code
# (Create test script to verify session creation workflow)
node -e "
// Test session creation via application layer
// Expected: Session created successfully through event sourcing
"

# 7. Test session view computation
node -e "
// Test session view generation from events
// Expected: Session view computed correctly with proper structure
"
```

## Manual Verification Checklist
- [ ] Migration file created in `db/migrations/` directory
- [ ] Migration runs without errors
- [ ] Session events can be created in event_log table
- [ ] Session views can be computed and stored in view table
- [ ] Database schema supports session key pattern: `session:{sessionId}`
- [ ] Session data structure follows expected format:
  ```json
  {
    "id": "session-id",
    "project": "project-name",
    "messages": [],
    "status": "ready",
    "createdAt": timestamp,
    "updatedAt": timestamp
  }
  ```

## Success Metrics
- Migration completes in under 5 seconds
- Session data can be created and retrieved successfully
- Session views are computed correctly from events
- Database schema supports session architecture fully
- Clean implementation focused only on sessions