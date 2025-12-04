---
title: show assignee and labels
status: todo
priority: medium
---

# Description

## Cli

- make sure the below also shows the assignee and labels

```
kanbantte task list
```

- it can be tested locally with this:

```
bun run src/cli.js task list
```


- make sure it can filter by assignee and labels

```
kanbantte task list -a han4wluc
```

```
kanbantte task list -l cli
```


shows all tasks assigned to han4wluc with label cli

```
kanbantte task list -a han4wluc -l cli
```


## Website

http://kanbatte.yuusoft.com/tasks/

make sure in the list, we can see the assignee and labels


