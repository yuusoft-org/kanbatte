# Kanbatte CLI API

## Commands

### Creating Tasks

**Create a new task with inline parameters:**
```bash
kanbatte new task -p 'project-id' -t 'title of the task' --description 'task description'
kanbatte new task -p 'project-id' --title 'title of the task' --description 'task description'
```

**Create a new task from a markdown file:**
```bash
kanbatte new task -f 'path/to/file.md'
```

### Creating Comments

**Create a new comment:**
```bash
kanbatte new comment -tid 'taskId' -c 'comment content'
```

### Creating Followups

**Create a new followup:**
```bash
kanbatte new followup -tid 'taskId' -c 'followup content'
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
kanbatte list -p ${projectId}
```

**List tasks filtered by status:**
```bash
kanbatte list -p ${projectId} -s ready,in-progress
```

This command displays:
- Task ID
- Task title
- Status

### Reading Tasks

**Read and display a specific task:**
```bash
kanbatte read ${taskId}
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
kanbatte update task -tid ${taskId} -s ${status}
kanbatte update task -tid ${taskId} -t 'new title'
kanbatte update task -tid ${taskId} --title 'new title'
kanbatte update task -tid ${taskId} --description 'new description'
kanbatte update task -tid ${taskId} -s ${status} -t 'new title' --description 'new description'
```

**Update followup status:**
```bash
kanbatte update followup ${followupId} -s ${status}
```

## Examples

```bash
# Create a new task inline
kanbatte new task -p 'AI' -t 'Research ML models' --description 'Investigate latest transformer architectures'

# Create a task from file
kanbatte new task -f './tasks/new-feature.md'

# Create a new comment
kanbatte new comment -tid 'AI-001' -c 'This feature needs more testing before deployment'

# Create a new followup
kanbatte new followup -tid 'AI-001' -c 'Scheduled code review for next sprint'

# List all tasks in AI project
kanbatte list -p 'AI'

# List only ready and in-progress tasks
kanbatte list -p 'AI' -s ready,in-progress

# Read a specific task (shows task, comments, and followups)
kanbatte read AI-001

# Update task status to in-progress
kanbatte update task -tid 'AI-001' -s in-progress

# Update task title
kanbatte update task -tid 'AI-001' -t 'Research latest transformer architectures'

# Update multiple properties at once
kanbatte update task -tid 'AI-001' -s done -t 'Completed ML research' --description 'Research completed successfully'

# Update followup status to resolved
kanbatte update followup FU-123 -s resolved
```
