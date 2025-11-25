---
title:  discord create thread
status: todo
priority: medium
assignee: 738NGX
labels: [discord]
---

# Description

This task has dependency on TASK-018

```bash
# start
```

do this:

- get message from user in channel
- get the project attached to this channel id
- create a new session for this project with the message
- create a Discord thread.
  - write message into the discord thread
- save session id, thread id into the discord sqlite db

```js
// Not in a thread - create one
const thread = await interaction.channel.threads.create({
  name: `[${session.status}]${session.id}`,
  autoArchiveDuration: 1440, // 24 hours
  reason: `Session: ${session.id}`,
});

threadId = thread.id;

// Add the user who created the task to the thread
await thread.members.add(interaction.user.id);

// Send message to the new thread
await thread.send(messageContent);

// Update the deferred reply
await interaction.editReply({
  content: `Session created: <#${thread.id}>`,
  ephemeral: true
});


```

## TODO

- [ ] Update discord channel cli (channels->channel)
- [ ] add `createSession` slash command to create thread.
---
- [ ] save thread id & session id in discord db. (new table. columns: session_id* thread_id)
- [ ] should @
