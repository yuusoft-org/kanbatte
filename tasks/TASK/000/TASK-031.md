---
title: aggregate tasks
status: todo
priority: medium
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

## Plan

- When running `kanbatte task build`, copy the tasks.yaml (or maybe a modified version that adds more fields such as assignee) to `_site` folder as data source. Tasks.yaml could then be fetched from root directory. Decided to use `tasks.yaml` instead of `tasks.json` since it seem more straightforward than json. rettangoli-fe and rettangoli-ui should also work directly with `tasks.yaml`.
- Create new folder for page generated with `kanbatte task aggregate` (draft, may change file and folder details)
```
site-aggregate/
    pages/
    static/
    templates/
    sites.config.js
```
- After running `kanbatte task aggregate`, a SPA will be generated and put to `_site` under `tasks-aggregate`.
- The SPA will read config file `kanbatte.config.yaml` from root and update itself once per minute. The SPA will display workspace name, projects name, priority, assignee, label and title. Filter will be available to filter out (can do Github issue style, type something like `label: discord` in a searchbar).
- On clicking the displayed tasks, it will be redirected to the original page (e.g. Suppose aggregated data is held at http://kanbatte.aggregate.yuusoft.com/tasks-aggregate, clicking this TASK-031 will be redirected to http://kanbatte.yuusoft.com/tasks/TASK-031/). This decision:
  - Reduces repeativity and makes full use of existing sites
  - But will 'break' the `< Back` button in the existing sites -- `< Back` returns to specific project index instead of aggregated data index.
- More frontend implementation details (logging, error dealing, etc.) to be updated later.



## Other notes

Currently, all tasks are  `TASK` , this will cause different projects to have same task ID. in future we will change task to something unique for projects such ash `RG` for Route Graphics, `KAN` for kanbatte

