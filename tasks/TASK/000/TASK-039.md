---
title: improve followup messages in thread
status: done
priority: high
assignee: nellow
labels: [discord]
---

# Description

currently in a discord thread we can use `@yuusoft bot` to append messages to the conversation. however there are a couple of issues and UX that can be improved

- if @ contains a multiline, it seems to only take the 1st line. haven't fully tested this. needs to be verified.
- everytime, I need to first write the message with @ and then, do /set-status to update the status. this 2 step thing is wasteful. I wish it could automatically set statos to `ready`
- it may be a bit inconsistent that all places we are using commands with / , but here we do @ directly. advantage of / is that we can pass structured parameters, but disadvantage is that it can't really take long text or multiple or markdown.
  - for now just use slash commands
- consider a situation when AI is working and sending messages, but I also want to send the followup. currently the best thing to do is to wait for AI to finish and then send the message. if we send message in between, it will just be buried between all messages.
  - for now just make the AI if it is processing when it receives a message


