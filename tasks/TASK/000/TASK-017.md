---
title: setup discord plugin
assignee: 738NGX
status: done
priority: medium
labels: [discord]
---

# Description

Discord Plugin:

We have to implement in a way that the discord plugin is completely separate from kanbatte
Create a folder `plugins/discord`, and we put all discord related code there. In future if anyone wants can implement more plugins for apps.

We want to implment the following in Discord:

```bash
# runs db setup. we create an event log and view table for discord. it has to specify its own migratons version table. table are completely separate from normal ones.
kanbatte discord db setup

# add channel. this will be stored in db.
kanbatte discord channel add -p AA --c channel-id some_channel_id 
kanbatte discord channel update -p AA --c channel-id some_channel_id 

# start
kanbatte discord start
```

Discord start will do the following:

- fetch all events above last offset
- filter only events related to sessions
- just console log the event data for now. in future we will send real discord message
- update the offset. needs to be stored in discord db event log.
- wait 10 seconds
- start agin from 1st step

----

- [ ] implement `discord db setup`
- [ ] implement `discord channel add`
- [ ] implement `discord channel update`
- [ ] implement `discord start`

