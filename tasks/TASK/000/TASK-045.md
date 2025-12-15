---
title: for session history use claude code session id
status: todo
priority: high
assignee: nellow
---

# Description

currently for followups, we are appending all the prevoius history as text json into the convo. this is very inefficient and does not take enefit of token cashing, and the json messes up the format.

that is why often the Discord Bot seems not to follow instructions for follow up messages


## What it should be

claude code sdk, has a sessionId for each convo. this is how they implement /resume

we should just pass this sessionId instead of passing the history query in here:

```js
        const result = query({
          prompt: userPrompt,
          options: {
            model: "opus",
            settingSources: ['project'],
            canUseTool: (toolName, inputData) => {
              return {
                behavior: "allow",
                updatedInput: inputData,
              };
            },
            cwd: worktreePath,
          },
        });

```

the query also returns a sessionId somewhere in the response, so we have to save this in our db togehter with discord threadId.


