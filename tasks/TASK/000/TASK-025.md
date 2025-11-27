---
title: Convert Discord set-status command to use enum instead of free text
status: done
priority: medium
---

# Description

Right now the Discord set-status command takes free text input and validates it against hardcoded values. It should use Discord's enum choices instead to provide a dropdown interface for users and prevent invalid inputs.

Currently in `/src/plugins/discord/slash-commands/sessions.js`, the `set-status` command:
- Uses `.addStringOption()` which accepts free text input
- Validates the input against `['ready', 'in-progress', 'review', 'done']` array
- Shows an error message if invalid status is provided

The command should be updated to use Discord's `addChoices()` method to provide a dropdown with valid options, making it more user-friendly and preventing invalid inputs entirely.

# Acceptance Criteria

1. **Update Discord slash command definition**:
   - Replace free text string option with enum choices
   - Use `addChoices()` method to provide dropdown options: ready, in-progress, review, done

2. **Update command execution logic**:
   - Remove manual validation logic since enum choices prevent invalid inputs
   - Simplify the execute function since validation is no longer needed
   - Ensure the status value is still properly handled and updated

3. **Maintain functionality**:
   - Command should still work exactly the same for valid inputs
   - Error handling for other cases (not in thread, no session found) should remain unchanged
   - Status updates should still work correctly

# Implement Plan

## 1. Update Slash Command Definition
- Modify the `setStatus.data` definition in `/src/plugins/discord/slash-commands/sessions.js`
- Replace `.addStringOption()` with enum choices using `.addChoices()`
- Add choices for: 'ready', 'in-progress', 'review', 'done'

## 2. Simplify Command Execution Logic
- Remove the validation check: `if (!['ready', 'in-progress', 'review', 'done'].includes(status))`
- Remove the corresponding error response for invalid status
- Keep all other error handling (thread check, session existence check)

## 3. Test the Changes
- Verify the command shows dropdown options in Discord
- Test that all valid status choices work correctly
- Confirm that existing functionality is preserved
- Ensure the command still provides proper feedback messages