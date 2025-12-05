---
title: Discord improvements
status: done
priority: medium
---

# Description

When Discord bot created a thread, should add the user to the thread.

```js
await thread.members.add(interaction.user.id);
```


When session status is set to done. Should archive and lock the thread.

```js
if (newStatus === 'done') {
    await thread.setArchived(true);
    await thread.setLocked(true);
}
```
