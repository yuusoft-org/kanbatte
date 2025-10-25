# Kanbatte CLI API

## Commands

### Creating Tasks

**Create a new task with inline parameters:**
```bash
kanbatte task create -p 'project-id' -t 'title of the task' --description 'task description'
kanbatte task create -p 'project-id' --title 'title of the task' --description 'task description'
```

**Create a new task from a markdown file:**
```bash
kanbatte task create -f 'path/to/file.md'
```

### Creating Comments

**Create a new comment:**
```bash
kanbatte task comment -i 'taskId' -c 'comment content'
```

### Creating Followups

**Create a new followup:**
```bash
kanbatte task followup -i 'taskId' -c 'followup content'
```

#### Task File Format
When using `-f`, the markdown file should follow this convention:

```markdown
# ${projectId} - ${projectTitle}

${task description}
```

### Listing Tasks

**List all tasks in a project:**
```bash
kanbatte task list -p ${projectId}
```

**List tasks filtered by status:**
```bash
kanbatte task list -p ${projectId} -s ready,in-progress
```

This command displays:
- Task ID
- Task title
- Status

### Reading Tasks

**Read and display a specific task:**
```bash
kanbatte task read ${taskId}
```

This command will print the complete task information including:
- Task ID
- Task title
- Task description
- Comments
- Followups

### Updating Tasks

**Update task properties:**
```bash
kanbatte task update -i ${taskId} -s ${status}
kanbatte task update -i ${taskId} -t 'new title'
kanbatte task update -i ${taskId} --title 'new title'
kanbatte task update -i ${taskId} --description 'new description'
kanbatte task update -i ${taskId} -s ${status} -t 'new title' --description 'new description'
```

**Update followup status:**
```bash
kanbatte task update-followup ${followupId} -s ${status}
```

### Projects
**Create a project**
```bash
kanbatte project create -p AA -r git@github.com:example/example.git -n project-name -d description
kanbatte project create --project AA --repository git@github.com:example/example.git --name project-name --description description
```

## Examples

```bash
# Create a new task inline
kanbatte task create -p 'AI' -t 'Research ML models' --description 'Investigate latest transformer architectures'

# Create a task from file
kanbatte task create -f './tasks/new-feature.md'

# Create a new comment
kanbatte task comment -i 'AI-001' -c 'This feature needs more testing before deployment'

# Create a new followup
kanbatte task followup -i 'AI-001' -c 'Scheduled code review for next sprint'

# List all tasks in AI project
kanbatte task list -p 'AI'

# List only ready and in-progress tasks
kanbatte task list -p 'AI' -s ready,in-progress

# Read a specific task (shows task, comments, and followups)
kanbatte task read AI-001

# Update task status to in-progress
kanbatte task update task -i 'AI-001' -s in-progress

# Update task title
kanbatte task update task -i 'AI-001' -t 'Research latest transformer architectures'

# Update multiple properties at once
kanbatte task update task -i 'AI-001' -s done -t 'Completed ML research' --description 'Research completed successfully'

# Update followup status to resolved
kanbatte task update followup FU-123 -s resolved
```


