---
title: migrate to use insieme for writing to event store db
assignee: 738NGX
status: done
priority: high
---

# Description

currently for the eventlog we are writing directly to the db. which means we need to implement a lot of the event log features from scratch.

try see if we can migrate to  https://github.com/yuusoft-org/insieme

it will make it more easier when we enable collaboration and data sync features as we rely on the library instead of implementing all from scratch

# Implementation Plan

## Current Architecture Analysis

### Current Data Flow
```
CLI Commands → session.js/agent.js → libsqlDao.js → libsql client → SQLite DB
```

### Current Database Schema
- `event_log` table: stores events with custom format
- `view` table: stores current state (materialized view)
- Complex business queries for data retrieval

## Migration Strategy

### Phase 1: Insieme Storage Adapter Implementation

#### 1. Create Kanbatte Insieme Storage Adapter
**File**: `src/adapters/kanbatteInsiemeAdapter.js` (new)

```javascript
import { createClient } from "@libsql/client";
import { decode, encode } from "@msgpack/msgpack";

export const createKanbatteInsiemeAdapter = async (dbPath) => {
  const db = createClient({ url: `file:${dbPath}` });

  return {
    // Insieme store interface - supports partitioning
    async getEvents(payload = {}) {
      const { partition } = payload;

      if (partition) {
        // Get events for specific partition
        const result = await db.execute({
          sql: "SELECT type, payload FROM events WHERE partition = ? ORDER BY created_at",
          args: [partition]
        });

        return result.rows.map(row => ({
          type: row.type,
          payload: decode(row.payload)
        }));
      } else {
        // No events for full initialization - Insieme will build from partitions
        return [];
      }
    },

    async appendEvent(event) {
      const { partition, type, payload } = event;
      const serializedPayload = encode(payload);

      await db.execute({
        sql: "INSERT INTO events (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))",
        args: [partition, type, serializedPayload]
      });
    }
  };
};
```

#### 2. Update CLI Entry Point
**File**: `src/cli.js` (modify)

```javascript
import { createRepository } from "insieme";
import { createKanbatteInsiemeAdapter } from "./adapters/kanbatteInsiemeAdapter.js";
import { existsSync } from "fs";

// Replace createLibsqlDao() with createInsiemeRepository()
// IMPORTANT: This function should ONLY be called by database-dependent commands (session, agent)
// Task commands should NEVER call this function to avoid triggering database creation
const createInsiemeRepository = async () => {
  const dbPath = join(projectRoot, "local.db");

  // Check database existence only when this function is called
  // This ensures task commands never trigger database checks
  if (!existsSync(dbPath)) {
    throw new Error("Database not found. Please run 'kanbatte db setup' first.");
  }

  // Create Insieme storage adapter with partitioning support
  const store = await createKanbatteInsiemeAdapter(dbPath);

  const repository = createRepository({
    originStore: store,
    usingCachedEvents: false  // Critical: Use partitioning, disable caching
  });

  // Initialize with flat state structure
  await repository.init({
    initialState: {
      sessions: {},
      projects: {}
    }
  });

  return repository;
};
```

### Phase 2: Update Database Setup Command

#### Update DB Setup
**File**: `src/cli.js` (modify - find the setupDB function)

```javascript
const setupDB = async () => {
  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: migrationsPath,
  });

  // Run all migrations including the new events table migration
  await umzug.up();

  console.log("Database setup complete with Insieme support");
};
```

#### Create Events Table Migration
**File**: `db/migrations/002-create-events-table.sql` (new)

```sql
-- Migration for Insieme events table with partitioning support
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partition TEXT NOT NULL,
    type TEXT NOT NULL,
    payload BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient partition queries
CREATE INDEX IF NOT EXISTS idx_events_partition ON events(partition);
CREATE INDEX IF NOT EXISTS idx_events_partition_id ON events(partition, id);
```

### Phase 3: Command Layer Migration with Insieme Partitions

**IMPORTANT**: Only `kanbatte db setup` should create database files. All other commands must respect this requirement.

#### Command Categories

**Database-Dependent Commands** (require `kanbatte db setup` first):
- `kanbatte session` (all session subcommands)
- `kanbatte project` (all project subcommands)
- `kanbatte agent`

**Database-Independent Commands** (no database required):
- `kanbatte task` (all task subcommands)
- `kanbatte db setup` (creates the database)

#### Implementation Strategy

**CLI Command Structure**:
```javascript
// Session commands - these call createInsiemeRepository()
sessionCmd
  .command("queue")
  .action(async (options) => {
    const repository = await createInsiemeRepository(); // Database check happens here
    const result = await addSession({ repository }, options);
    // ... session logic
  });

// Task commands - these work with files only (no database)
taskCmd
  .command("create")
  .action(async (options) => {
    const result = createTask(projectRoot, options); // Current implementation
    // ... task logic using files only
  });

// Note: Future dependency injection will be handled by tasks/TASK/000/TASK-008.md
```

**Key Points**:
1. **Never call `createInsiemeRepository()` in task commands**
2. **Database existence check only happens inside `createInsiemeRepository()`**
3. **Task commands work with files only** (no database dependencies)
4. **CLI entry point remains database-agnostic**

### Complete CLI Commands Implementation

#### 1. Session Commands

**File**: `src/commands/session.js`

```javascript
// kanbatte session queue <project> <message>
export const addSession = async (deps, payload) => {
  const { repository } = deps;
  const { project, message } = payload;

  // Generate session ID (existing logic)
  const sessionNumber = await getNextSessionNumber({ project });
  const sessionId = `${project}-${sessionNumber}`;
  const now = Date.now();

  // Create session with Insieme - use set for initial object creation
  await repository.addEvent({
    type: "set",
    partition: `session-${sessionId}`,
    payload: {
      target: `sessions.${sessionId}`,
      value: {
        sessionId,
        messages: [], // Start with empty messages array
        status: "ready",
        project,
        createdAt: now,
        updatedAt: now
      }
    }
  });

  // Add session to metadata partition
  await repository.addEvent({
    type: "treePush",
    partition: 'metadata',
    payload: {
      target: `metadata.projects.${project}.sessions`,
      value: sessionId
    }
  });

  // Add initial message using treePush (same format as appendSessionMessages)
  await repository.addEvent({
    type: "treePush",
    partition: `session-${sessionId}`,
    payload: {
      target: `sessions.${sessionId}.messages`,
      value: [{ role: "user", content: message, timestamp: now }]
    }
  });

  return { sessionId, project, message };
};

// kanbatte session append <sessionId> <messages>
export const appendSessionMessages = async (deps, payload) => {
  const { repository } = deps;
  const { sessionId, messages } = payload;

  // Push the entire message list at once using treePush
  await repository.addEvent({
    type: "treePush",
    partition: `session-${sessionId}`,
    payload: {
      target: `sessions.${sessionId}.messages`,
      value: messages.map(msg => ({ ...msg, timestamp: msg.timestamp || Date.now() }))
    }
  });

  return { sessionId, messagesCount: messages.length };
};

// kanbatte session view <sessionId>
export const getSession = async (deps, sessionId) => {
  const { repository } = deps;
  const state = await repository.getState({ partition: `session-${sessionId}` });
  const sessionData = state?.sessions?.[sessionId] || null;

  if (sessionData && sessionData.messages) {
    // Flatten nested arrays created by treePush operations
    sessionData.messages = sessionData.messages.flat();
  }

  return sessionData;
};

// kanbatte session list <project>
export const getProjectSessions = async (deps, projectId) => {
  const { repository } = deps;

  // Get all sessions for project from metadata partition
  const metadataState = await repository.getState({ partition: 'metadata' });
  const projectSessions = metadataState?.metadata?.projects?.[projectId]?.sessions || [];

  const sessions = [];
  for (const sessionId of projectSessions) {
    const sessionState = await repository.getState({ partition: `session-${sessionId}` });
    const sessionData = sessionState?.sessions?.[sessionId];
    if (sessionData) {
      // Flatten nested arrays created by treePush operations
      if (sessionData.messages) {
        sessionData.messages = sessionData.messages.flat();
      }
      sessions.push(sessionData);
    }
  }

  return sessions;
};

```

#### 2. Project Commands

**File**: `src/commands/project.js`

```javascript
// kanbatte project add <projectId> <name> [repo] [description]
export const addProject = async (deps, payload) => {
  const { repository } = deps;
  const { projectId, name, repository: repo, description } = payload;

  // Create project partition
  await repository.addEvent({
    type: "set",
    partition: `project-${projectId}`,
    payload: {
      target: `projects.${projectId}`,
      value: {
        projectId,
        name,
        repository: repo,
        description,
        createdAt: Date.now()
      }
    }
  });

  // Add project to metadata partition
  await repository.addEvent({
    type: "set",
    partition: 'metadata',
    payload: {
      target: `metadata.projects.${projectId}`,
      value: {
        projectId,
        name,
        sessions: []
      }
    }
  });

  return { projectId, name, repository: repo, description };
};

// kanbatte project view <projectId>
export const getProject = async (deps, projectId) => {
  const { repository } = deps;
  const state = await repository.getState({ partition: `project-${projectId}` });
  return state?.projects?.[projectId] || null;
};

// kanbatte project list
export const getAllProjects = async (deps) => {
  const { repository } = deps;

  // Get all projects from metadata partition
  const metadataState = await repository.getState({ partition: 'metadata' });
  const allProjects = metadataState?.metadata?.projects || {};

  const projects = [];
  for (const projectId of Object.keys(allProjects)) {
    const projectState = await repository.getState({ partition: `project-${projectId}` });
    const projectData = projectState?.projects?.[projectId];
    if (projectData) {
      projects.push(projectData);
    }
  }

  return projects;
};

```

#### 3. Agent Commands

**File**: `src/commands/agent.js`

```javascript
// kanbatte agent process <sessionId>
export const processAgentTasks = async (deps, sessionId) => {
  const { repository } = deps;

  // Get session state
  const sessionState = await repository.getState({ partition: `session-${sessionId}` });
  const session = sessionState?.sessions?.[sessionId];

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Flatten nested arrays created by treePush operations
  if (session.messages) {
    session.messages = session.messages.flat();
  }

  // Agent processing logic (existing implementation)
  // ... process tasks and generate responses

  // Add agent response using treePush (same format as other message operations)
  const agentResponse = { role: "assistant", content: "Agent response", timestamp: Date.now() };

  await repository.addEvent({
    type: "treePush",
    partition: `session-${sessionId}`,
    payload: {
      target: `sessions.${sessionId}.messages`,
      value: [agentResponse]
    }
  });

  return { sessionId, processed: true };
};
```

#### 4. CLI Command Registration

**File**: `src/cli.js` (modify command handlers)

```javascript
// Session commands
sessionCmd
  .command("queue")
  .argument("<project>", "Project ID")
  .argument("<message>", "Initial message")
  .action(async (project, message, options) => {
    const repository = await createInsiemeRepository();
    const result = await addSession({ repository }, { project, message });
    console.log(`Session created: ${result.sessionId}`);
  });

sessionCmd
  .command("append")
  .argument("<sessionId>", "Session ID")
  .argument("<messages...>", "Messages to append")
  .action(async (sessionId, messages, options) => {
  const repository = await createInsiemeRepository();
    const formattedMessages = messages.map(msg => ({ role: "user", content: msg }));
    await appendSessionMessages({ repository }, { sessionId, messages: formattedMessages });
    console.log(`Messages appended to session ${sessionId}`);
  });

sessionCmd
  .command("view")
  .argument("<sessionId>", "Session ID")
  .option("-f, --format <format>", "Output format: table, json, markdown", "markdown")
  .action(async (sessionId, options) => {
    const repository = await createInsiemeRepository();
    const session = await getSession({ repository }, sessionId);
    formatOutput(session, options.format, "read");
  });

sessionCmd
  .command("list")
  .argument("<projectId>", "Project ID")
  .option("-f, --format <format>", "Output format: table, json, markdown", "table")
  .action(async (projectId, options) => {
    const repository = await createInsiemeRepository();
    const sessions = await getProjectSessions({ repository }, projectId);
    if (sessions && sessions.length > 0) {
      formatOutput(sessions, options.format, "list");
    } else {
      console.log("No sessions found for this project.");
    }
  });

// Project commands
projectCmd
  .command("add")
  .argument("<projectId>", "Project ID")
  .argument("<name>", "Project name")
  .argument("[repo]", "Repository URL")
  .argument("[description]", "Project description")
  .action(async (projectId, name, repo, description, options) => {
    const repository = await createInsiemeRepository();
    await addProject({ repository }, { projectId, name, repository: repo, description });
    console.log(`Project ${projectId} created`);
  });

projectCmd
  .command("view")
  .argument("<projectId>", "Project ID")
  .option("-f, --format <format>", "Output format: table, json, markdown", "table")
  .action(async (projectId, options) => {
    const repository = await createInsiemeRepository();
    const project = await getProject({ repository }, projectId);
    formatOutput(project, options.format, "read");
  });

projectCmd
  .command("list")
  .option("-f, --format <format>", "Output format: table, json, markdown", "table")
  .action(async (options) => {
    const repository = await createInsiemeRepository();
    const projects = await getAllProjects({ repository });
    if (projects.length > 0) {
      console.log("Projects:");
      console.table(projects);
    } else {
      console.log("No projects found.");
    }
  });

// Task commands remain unchanged (no database)
taskCmd
  .command("create")
  .argument("<taskId>", "Task ID")
  .argument("<title>", "Task title")
  .action(async (taskId, title, options) => {
    // Existing file-based implementation, no database calls
    createTask(projectRoot, { taskId, title });
    console.log(`Task ${taskId} created`);
  });
```