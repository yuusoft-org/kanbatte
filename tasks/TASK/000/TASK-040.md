---
title: make it runnable on docker
status: medium
priority: low
---

# Description

this will make the bot more scalable and easier to deploy, and easier to deploy mulitple instances in a single server.

challenges:

- claude code authentication
  - currently we are manually going in the server and authenticating the claude code cli
- github cli authenticaation
  - currently we are manually logging in with `gh auth login`
- github ssh key
  - this needs to be set up, but should be easy to do as we just need to make sure the priv key is there inside docker

