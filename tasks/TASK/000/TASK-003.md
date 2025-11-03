---
title: Implement basic session CLI commands
status: todo
priority: high
---

# Description

Implement the core session CLI commands for basic session management operations.

# Required Commands
Based on roadmap specifications:
```bash
kanbatte session status 'session-id'            # Get session status
kanbatte session status 'session-id' 'status'  # Set session status
kanbatte session view 'session-id'             # View session details
```

# Implementation Steps
1. Add session command group to CLI structure
2. Implement session status command (get/set)
3. Implement session view command with markdown output
4. Add session existence validation
5. Integrate with libsqlDao for session data access

# Command Details
- **session status**: Support both getter and setter modes
- **session view**: Display session in markdown format with messages
- **Error handling**: Clear messages for non-existent sessions
- **Output formatting**: Consistent with existing command output

# Technical Requirements
- Use existing command structure patterns
- Integrate with formatOutput utility
- Support pipeline operations (e.g., `session view abc | less`)
- Maintain backward compatibility during transition

# Dependencies
- Requires TASK-001 (database schema) to be completed
- Requires TASK-007 (message validation) for proper formatting

# Verification Criteria

## CLI Command Tests
```bash
# 1. Test session status getter
kanbatte session status 'non-existent-session'
# Expected: Error message "Session 'non-existent-session' not found"

# 2. Test session status setter
kanbatte session status 'non-existent-session' 'in-progress'
# Expected: Error message "Session 'non-existent-session' not found"

# 3. Test session view for non-existent session
kanbatte session view 'non-existent-session'
# Expected: Error message "Session 'non-existent-session' not found"

# 4. Test help command
kanbatte session --help
# Expected: Shows session command group with status and view subcommands
```

## Database Integration Tests
```bash
# 5. Create test session in database
sqlite3 local.db "
INSERT INTO event_log (id, key, data, created_at) VALUES
('test-session-1', 'session:test-session-1', X'890000000000000069640000000000000373657373696f6e2d746573742d31000000000000000770726f6a6563742d31000000000000057265616479a5000000000000066d65737361676573940000000000000000000000000000016800000000000000637265617465644174000000000000646c6173745570646174656400000000000000', $(date +%s));
"
# Expected: Session created successfully

# 6. Test session status getter
kanbatte session status 'test-session-1'
# Expected: Output "ready"

# 7. Test session status setter
kanbatte session status 'test-session-1' 'in-progress'
# Expected: Output "Session status updated to 'in-progress'"

# 8. Verify status change
kanbatte session status 'test-session-1'
# Expected: Output "in-progress"

# 9. Test session view
kanbatte session view 'test-session-1'
# Expected: Markdown output with session details:
# # Session: test-session-1
# **Project:** project-1
# **Status:** in-progress
# **Created:** [timestamp]
# **Updated:** [timestamp]
#
# ## Messages
# *No messages*
```

## Output Format Tests
```bash
# 10. Test session view with messages (manual database setup)
# Add messages to session and verify markdown formatting
kanbatte session view 'test-session-1'
# Expected: Proper markdown formatting with message list

# 11. Test pipeline compatibility
kanbatte session view 'test-session-1' | head -5
# Expected: First 5 lines of markdown output

# 12. Test command error handling
kanbatte session status 'test-session-1' 'invalid-status'
# Expected: Error message about valid status values
```

## Manual Verification Checklist
- [ ] Session command group added to CLI structure
- [ ] `session status` command supports both getter and setter modes
- [ ] `session view` command displays markdown-formatted session details
- [ ] Error handling for non-existent sessions works correctly
- [ ] Status validation accepts only: ready, in-progress, review, done
- [ ] Commands integrate with libsqlDao properly
- [ ] Output format is consistent with existing commands
- [ ] Pipeline operations work (e.g., `| less`, `| head`)
- [ ] Help text is clear and comprehensive
- [ ] Database queries are efficient and use proper indexes

## Expected Data Structures
```json
// Session data structure in database
{
  "id": "test-session-1",
  "project": "project-1",
  "messages": [],
  "status": "ready",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}

// Expected markdown output format
# Session: test-session-1
**Project:** project-1
**Status:** in-progress
**Created:** 2024-01-15 10:30:00
**Updated:** 2024-01-15 10:35:00

## Messages
*No messages*
```

## Success Metrics
- All commands execute without errors
- Error messages are clear and actionable
- Output format matches existing command patterns
- Commands complete in under 1 second
- Database queries are optimized (use indexes)
- Backward compatibility maintained
- Help documentation is accurate