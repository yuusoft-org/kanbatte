---
title: 'Fix Discord API error: Cannot send an empty message (code 50006)'
status: done
priority: high
---

# Description

Error occurs when posting to Discord channel. RequestBody has empty files array and json object. Need to investigate why message content is empty before sending to Discord API.

# Solution

Added validation checks before all `thread.send()` calls in `src/plugins/discord/commands/start.js`:
- Check if message content is empty before sending
- Trim whitespace and validate length > 0
- Updated `splitTextForDiscord` in utils.js to return empty array for null/empty input

This prevents Discord API error 50006 by ensuring we never attempt to send empty messages.
