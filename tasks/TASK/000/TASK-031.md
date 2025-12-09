---
title: aggregate tasks
status: done
priority: medium
assignee: JeffY
---

# Description

## Context

We have many different projects with tasks and now each live in their own repo and url such as

- http://kanbatte.yuusoft.com/tasks/
- http://route-graphics.routevn.com/tasks/

It is hard to see:

- tasks across multiple projects
- who is working on what

## Solution

- Create a page which will aggregate all tasks accross different projects and display it in a single page
- have workspaces where can group multiple projects
- can filter by user, project etc...

### Implementation plan:

Data source:

- http://route-graphics.routevn.com/tasks/ returns an html page, we need to create a http://route-graphics.routevn.com/tasks.json that will return a json representation

Aggregate page:

- This page will essentially regularly fetch the `tasks.json` from each page, and store it locally in browser.
- Then it would just have a frontend to display this data to user, data can be filtered.


Tech stack for this frontend:

config file which will be stored in a file in codebase:

```yaml
workspaces:
  - name: Yuusoft
    projects:
      - name: Kanbatte
        url: http://kanbatte.yuusoft.com
  - name: RouteVN
    projects:
      - name: Route Graphics
        url: http://route-graphics.routevn.com

```

Frontend setup:

- setup a frontend usring rettangoli-fe and rettangoli-ui (might need @hanwluc's help to setup this)
- somehow pass that yaml config file to the frontend
- frontend fetch the data every 1 min and updates the display


### Usage

- assuming we have a `kanbatte.config.yaml`
- user can run `kanbatte task aggregate`
- it will generate SPA in `_site` folder, ready to be deployed as static files

## Other notes

Currently, all tasks are  `TASK` , this will cause different projects to have same task ID. in future we will change task to something unique for projects such ash `RG` for Route Graphics, `KAN` for kanbatte

