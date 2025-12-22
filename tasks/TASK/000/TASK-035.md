---
title: improve PR generation
status: done
priority: medium
assignee: nellow
labels: [discord]
---

# Description

## Context

Currently, PR (Pull Request) generation requires manual intervention via slash commands. This creates friction in the development workflow and requires developers to remember to run specific commands.

## Solution

Implement automatic PR generation when code is ready for review, without requiring manual slash commands from developers.

## Implementation Options

### 1. Session-based User Identification
- Store user ID with session in database when user starts a session
- Retrieve this information later for automatic PR creation
- Benefits: Direct user attribution without manual input

### 2. AI-driven Automatic PR Generation
- Add system prompt for AI to automatically generate PRs when:
  - New files are committed
  - Code is ready for review
- AI would determine appropriate timing based on code completeness and context
- Benefits: Fully automated based on code state analysis

### 3. CLI Improvements for Git Commands
- Optimize git command workflow
- Reduce number of commands needed
- Potentially create wrapper commands that combine multiple git operations
- Examples:
  - Single command for commit + PR creation
  - Smart detection of when PR should be created
  - Batch operations for common workflows

## Technical Requirements

- Maintain existing PR quality and information standards
- Ensure proper attribution and tracking
- Integrate seamlessly with current development workflow
- Support rollback to manual mode if needed

## Success Criteria

- PRs are generated automatically without manual slash commands
- User attribution is correctly maintained
- Development workflow is faster and more streamlined
- System can intelligently determine when a PR should be created
