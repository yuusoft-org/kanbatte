---
title: move config from db to file
status: todo
priority: high
assignee: anyone
labels: [ux]
---

# Description

currently we store several data using cli and store it in db.

this includes:

```bash

kanbatte session project
kanbatte discord user
kanbatte discord bot allowed-roles
kanbatte discord channel
```

It has become a bit of hassle to to go to the server cli and run those commands.

We want to make the following change:

Let all the above be configurable from a single yaml file.

example:

kanbatte.config.yaml

```yaml


projects:
  - id: kanbatte
    gitRepository: git@github.com:yuusoft-org/kanbatte.git


discord:
  users:
    - userId: 123
      gitAuthor: han4wluc <han4wluc@yuusoft.com>
  servers:
    - name: Yuusoft
      guildId: 1234
      channels:
        - projectId: kanbatte
          channelId: 1234
      allowedRoles:
        - 1234

```
this config is flexible, can support multiple servers.


in future we will extend this config to add custom system prompts, prompt presets, and even channel specific prompts.

