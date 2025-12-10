---
title: Add session append stop option
status: todo
priority: low
labels: ['discord', 'session']
---

# Description

Add the `--stop` flag to the `kanbatte session append` command that tells the agent to stop working and resume immediately, so it will pick up the last message sent by the user.

### Usage

```bash
kanbatte session append 'session id' --stop --messages '[{...}]'
kanbatte session append 'session id' -t -m '[{...}]'
```

The `--stop` option should interrupt the current agent process and signal that this session requires immediate attention.

# Acceptance Criteria

# Implement Plan
