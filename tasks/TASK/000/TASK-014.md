---
title: Unify the message format to the completion API.
status: done
priority: high
---

# Description

Currently the codebase has multiple message formats that evolved over time:

1. **Standard completion API format**: `{role: 'user/assistant/system', content: 'string'}`
2. **Assistant array format**: `{role: 'assistant', content: [...]}`
3. **Error format**: `{type: 'error', content: 'error message'}`
4. **Legacy string format**: Direct strings

This format inconsistency creates complexity, leads to parsing errors, and makes the code harder to maintain. The goal is to unify all message formats to use the standard completion API format throughout the system.

**Target**: All messages should follow the standard completion API format: `{role: string, content: string | Array}` where the content field can be either a string for simple messages or an array for complex content.


