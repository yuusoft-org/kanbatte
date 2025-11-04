---
title: Add Assignee
status: todo
assignee: aditya
priority: high
---

# Description

We want to add assignee to the task cli

assignee is optional.


```bash
kanbatte task create TASK -t 'title of the task' -d 'task description' -p 'high' -a 'username'
# Creates file in the correct folder with correct content

kanbatte task create TASK --title 'title of the task' --description 'task description' --priority 'high' --assignee 'username'


kanbatte task list TASK -s 'todo' -p 'high' -a 'username'
# it should also add assignee column to the result table

```


