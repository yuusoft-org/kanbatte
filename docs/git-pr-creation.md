# Git PR Creation Workflow

This document explains how Kanbatte integrates with Git to create Pull Requests automatically when working with AI agents.

## Overview

Kanbatte uses Git worktrees to isolate work for each task. When an AI agent completes work on a task, it can automatically create a pull request with all the changes.

## Git Worktree Setup

### What are Git Worktrees?

Git worktrees allow you to have multiple working directories from the same repository. This is perfect for managing multiple tasks in parallel without switching branches constantly.

### How Kanbatte Uses Worktrees

For each task with status `ready`, Kanbatte:

1. **Checks if the project repository exists**
   - Location: `./repositories/{repo-name}/`
   - If not, clones the repository from the project's configured URL

2. **Creates a dedicated worktree**
   - Location: `./worktrees/{taskId}/`
   - Branch name: `task/{taskId-lowercase}` (e.g., `task/kb-5`)
   - Based on the `main` branch

3. **Sets working directory for AI agent**
   - The agent operates within the worktree directory
   - All file operations happen in this isolated environment

### Example Directory Structure

```
kanbatte-project/
├── repositories/
│   └── new-kanbatte/        # Main repo clone
│       └── .git/
├── worktrees/
│   ├── KB-1/                # Worktree for task KB-1
│   │   └── src/
│   ├── KB-2/                # Worktree for task KB-2
│   │   └── src/
│   └── KB-5/                # Worktree for task KB-5 (current)
│       └── src/
└── local.db
```

## PR Creation Workflow

### Automated Flow

When running the agent command (`kanbatte agent`), the following happens:

1. **Task Selection**
   - Agent picks the first task with status `ready`
   - Example: `KB-5: Make a new md file telling git pr creation works`

2. **Worktree Setup**
   ```javascript
   const worktreePath = await setupWorktree(task.taskId);
   // Creates: ./worktrees/KB-5 on branch task/kb-5
   ```

3. **AI Agent Execution**
   - Agent receives task context (ID, title, description)
   - Works in the isolated worktree directory
   - Can read, write, and modify files
   - Can execute git commands

4. **Git Operations**
   - Agent stages changes: `git add <files>`
   - Agent creates commits with descriptive messages
   - Agent pushes branch to remote: `git push origin task/kb-5`

5. **Pull Request Creation**
   - Agent uses `gh` CLI to create PR
   - PR title matches the task title
   - PR body includes:
     - Summary of changes
     - Test plan (if applicable)
     - Reference to task ID
     - AI-generated badge

6. **Task Status Update**
   - Agent creates a comment with the work summary
   - Task status changes from `ready` to `review`
   - The PR URL is added to the comment

### Example PR Creation Command

The agent typically executes something like:

```bash
# Stage all changes
git add .

# Create commit
git commit -m "feat: implement git PR creation documentation

- Add comprehensive guide for git worktree workflow
- Document PR creation process
- Include examples and best practices

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push -u origin task/kb-5

# Create PR using GitHub CLI
gh pr create \
  --title "KB-5: Make a new md file telling git pr creation works" \
  --body "## Summary
- Created comprehensive documentation for git PR creation workflow
- Explains worktree setup and isolation
- Documents automated PR creation process

## Test plan
- [x] Verify markdown formatting
- [x] Check all sections are complete
- [x] Ensure examples are accurate

🤖 Generated with Claude Code"
```

## Configuration

### Project Setup

Projects are configured in `projects.yaml`:

```yaml
- projectId: KB
  name: Kanbatte
  repository: git@github.com:example/kanbatte.git
  description: |
    Kanban-style task management with AI agents
```

### Required Tools

- **Git**: For repository and worktree management
- **gh (GitHub CLI)**: For creating pull requests
  - Install: https://cli.github.com/
  - Authenticate: `gh auth login`

## Implementation Details

### Git Utility Functions

The `src/utils/git.js` module provides:

- `setupWorktree(taskId)`: Main function to setup worktree
- `ensureRepo(gitUrl, repoPath)`: Clone or update repository
- `createWorktree(repoPath, worktreePath, taskId)`: Create isolated worktree
- `getProjectPrefix(taskId)`: Extract project ID from task
- `getRepoName(gitUrl)`: Parse repository name from URL

### Agent Integration

The `src/agent/agent.js` module:

1. Queries database for tasks with status `ready`
2. Calls `setupWorktree()` to prepare environment
3. Invokes Claude Agent SDK with task context
4. Monitors agent output and git operations
5. Records results as comments
6. Updates task status to `review`

## Best Practices

### Branch Naming

- Format: `task/{taskId-lowercase}`
- Examples: `task/kb-1`, `task/ai-42`, `task/sp-100`
- Consistent and traceable to task IDs

### Commit Messages

Follow conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code refactoring
- `test:` for adding tests

Always include:
- Descriptive summary (imperative mood)
- Bullet points for key changes
- AI attribution footer

### PR Descriptions

Include:
- **Summary**: What changed and why
- **Test plan**: How to verify the changes
- **References**: Link to task ID
- **AI badge**: Indicate AI-generated work

### Cleanup

Worktrees should be removed after PR is merged:

```bash
# From main repository
git worktree remove worktrees/KB-5

# Delete remote branch after merge
git push origin --delete task/kb-5
```

## Troubleshooting

### Worktree Already Exists

If a worktree path exists but is broken:
```bash
git worktree prune
```

The system automatically handles this in `createWorktree()`.

### Branch Already Exists

If branch exists remotely but not locally:
```bash
git fetch origin task/kb-5:task/kb-5
git worktree add worktrees/KB-5 task/kb-5
```

The system handles this case automatically.

### Authentication Issues

Ensure SSH keys are configured:
```bash
ssh-add ~/.ssh/id_rsa
gh auth login
```

### No PR Created

Check:
- [ ] GitHub CLI is installed and authenticated
- [ ] Repository exists and is accessible
- [ ] Branch was pushed successfully
- [ ] You have permission to create PRs

## Future Enhancements

Planned improvements (see `roadmap.md`):

- [ ] Automatic PR review request assignment
- [ ] Integration with CI/CD status checks
- [ ] Auto-merge when tests pass
- [ ] Discord notifications for PR events
- [ ] Draft PR creation for work-in-progress
- [ ] PR template support
- [ ] Multi-repository project support

## References

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Conventional Commits](https://www.conventionalcommits.org/)
