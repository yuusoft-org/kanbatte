---
title: add task ui
status: done
assignee: 738NGX
priority: high
labels: [ui,task]
---

# Description

- The UI is read only
- the frontend static assets will be generated and published on each git merge
- UI should be generated with https://github.com/yuusoft-org/rettangoli/tree/main/packages/rettangoli-sites

- pages:
  - `/tasks` should show a list/table with all tasks
  - `/tasks.json` json raw data. useful for integrations.
  - `/tasks/{taskId}` should show the markdown page in html
  - `/tasks/{taskId}.md` should show raw markdown files

# UI Design

- TODO section
  - title
  - a list/table of all tasks

- DONE section
  - title
  - a list/table of all tasks

need to show following info for the task:

- Task ID
- Task title. with clickable link. click will open to `/tasks/{taskId}` (same tab)
- priority

This is enough for now. in future we will add more info and filters.

# Reference websites that use rtgl sites

- https://github.com/yuusoft-org/yuusoft-website
- https://github.com/yuusoft-org/routevn-website

easiest if you just create a folder and copy one of these project

# Plan

- do it manually first. copy all the md files, and create all the frontend, and generate static website using `rtgl sites build`

- automate it. it should be able to generate  `_site` folder for a cli command

```
kanbatte task build
```

We will then run this on every git merge and publish to github pages. And add the link to it in the README.

# Example code:

https://github.com/yuusoft-org/rettangoli/blob/c343502938e2b28a19dfd00fb245711f7c8eb63e/packages/rettangoli-cli/cli.js#L250

import { buildSite, watchSite, screenshotCommand } from "@rettangoli/sites/cli";

    await buildSite({
      rootDir: options.rootDir,
      outputPath: options.outputPath,
    });

