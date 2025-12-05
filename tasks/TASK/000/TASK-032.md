---
title: Tool Use Result handle
status: todo
priority: low
---

# Description

For example, web search result display...

Structure for reference:

```json
{
    "type": "user",
    "message": {
        "role": "user",
        "content": [
            {
                "tool_use_id": "call_pu41x0s5eu",
                "type": "tool_result",
                "content": "..."
            }
        ]
    },
    "toolUseResult": {Object. The content varies depending on the tool.}
}
```

Note: More info is in `toolUseResult`, not message. Only appear when type==user
