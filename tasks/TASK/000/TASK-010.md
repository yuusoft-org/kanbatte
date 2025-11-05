---
title: update project cli
status: done
priority: high
---

# Description

Make project cli work correctly

**Important:** Projects are completely unrelated to task types. Each session needs to be attached to a project because the project contains the git repository information.

### Managing Projects

```bash
# Create a project
kanbatte session project create -p project-name -r git@github.com:example/example.git -d description
kanbatte session project create --project project-name --repository git@github.com:example/example.git --description description

# Update a project
kanbatte session project update -p project-name -r git@github.com:example/example.git -d description

# List projects (shows table with columns: project-name, repository, description)
kanbatte session project list
```
# Acceptance Criteria

1. **Project Creation**:
   - `kanbatte session project create` command should work with proper project ID validation
   - Support both short and long option flags (-p/--project, -r/--repository, -d/--description)
   - Validate required fields (project, repository)
   - Store project in database with correct structure
   - Return success message with project details

2. **Project Update**:
   - `kanbatte session project update` command should update existing project
   - Support partial updates (only update provided fields)
   - Validate that project exists before updating
   - Handle optional fields properly

3. **Project Listing**:
   - `kanbatte session project list` command should display all projects in table format
   - Show columns: project-name, repository, description
   - Use formatOutput utility for consistent formatting
   - Handle empty project list gracefully

4. **Command Structure**:
   - Commands should be organized under `session project` subcommand structure
   - Follow existing CLI patterns and error handling
   - Maintain consistent help text and option descriptions

# Implement Plan

1. **Review Current Project Implementation**:
   - Analyze existing `addProject` function in sessionCommands.js
   - Check current CLI project command structure in cli.js
   - Identify missing functionality and required improvements

2. **Enhance Project Functions**:
   - Add `updateProject` function for updating existing projects
   - Add `listProjects` function for listing all projects
   - Ensure proper error handling and validation
   - Use consistent data structure across all project functions

3. **Update CLI Commands**:
   - Create proper project command group structure
   - Add missing `update` and `list` commands
   - Implement proper argument parsing and validation
   - Add helpful error messages and usage examples

4. **Ensure Data Consistency**:
   - Verify project data structure matches session requirements
   - Ensure projects can be properly referenced by sessions
   - Validate git repository URLs and project IDs

5. **Test Project Functionality**:
   - Test project creation with various inputs
   - Test project updates and edge cases
   - Test project listing and output formatting
   - Verify integration with session commands