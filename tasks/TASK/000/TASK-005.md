---
title: Add Assignee and Labels
status: done
assignee: aditya
priority: high
---

# Description

We want to add assignee and labels to the task cli

Both assignee and labels are optional. Labels should be an array of strings in the frontmatter.

## CLI Examples

```bash
kanbatte task create TASK -t 'title of the task' -d 'task description' -p 'high' -a 'username' -l 'ui,db,backend'
# Creates file in the correct folder with correct content, including multiple labels

kanbatte task create TASK --title 'title of the task' --description 'task description' --priority 'high' --assignee 'username' --labels 'ui,db'

kanbatte task list TASK -s 'todo' -p 'high' -a 'username' -l 'ui'
# Should add assignee and labels columns to the result table

kanbatte task list TASK -l 'ui,backend'
# Should filter tasks that have either 'ui' or 'backend' labels
```

## Frontmatter Structure

The created task files should include:

```yaml
---
title: Task Title
status: todo
assignee: username  # optional
priority: high
labels:            # optional
  - ui
  - db
  - backend
---
```


