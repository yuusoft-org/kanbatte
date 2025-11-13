---
title: migrate to use insieme for writing to event store db
assignee: 738NGX
status: todo
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

### Phase 1: Storage Adapter Implementation

#### 1. Create LibSQL Storage Adapter
**File**: `src/adapters/libsqlStore.js` (new)

```javascript
import { createClient } from "@libsql/client";

export const createLibsqlStore = async (dbPath, deps) => {
  const db = createClient({ url: `file:${dbPath}` });

  // Simplified schema - only events table needed
  await db.execute(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  return {
    // Insieme store interface - only 2 SQL operations needed
    async getEvents() {
      const result = await db.execute(
        "SELECT type, payload FROM events ORDER BY id"
      );
      return result.rows.map(row => ({
        type: row.type,
        payload: JSON.parse(row.payload)
      }));
    },

    async appendEvent(event) {
      await db.execute(
        "INSERT INTO events (type, payload) VALUES (?, ?)",
        [event.type, JSON.stringify(event.payload)]
      );
    }
  };
};
```

#### 2. Update CLI Entry Point
**File**: `src/cli.js` (modify)

```javascript
import { createRepository } from "insieme";
import { createLibsqlStore } from "./adapters/libsqlStore.js";
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

  const store = await createLibsqlStore(dbPath, {
    generateId,
    serialize,
    deserialize
  });

  const repository = createRepository({ originStore: store });

  // Initialize with flat state structure (no tree needed)
  await repository.init({
    initialState: {
      sessions: {},
      projects: {}
    }
  });

  return repository;
};

// Task commands should use their own dependency injection without database
const createTaskDeps = () => {
  return {
    generateId,
    serialize,
    deserialize,
    // No database dependencies
  };
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

  // Run existing migrations first
  await umzug.up();

  // Then create Insieme-compatible events table
  const db = createClient({ url: `file:${dbPath}` });

  await db.execute(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log("Database setup complete with Insieme support");
};
```

### Phase 3: Command Layer Migration

#### Session Commands Update
**File**: `src/commands/session.js` (modify)

```javascript
// Before: libsqlDao operations
export const addSession = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;
  const eventData = serialize({
    type: "session_created",
    sessionId: sessionId,
    data: sessionData,
    timestamp: Date.now(),
  });
  await libsqlDao.appendEvent({ entityId: sessionId, eventData });
  await libsqlDao.computeAndSaveView({ id: sessionId });
};

// After: Insieme operations
export const addSession = async (deps, payload) => {
  const { repository } = deps;
  const sessionId = `${payload.project}-${sessionNumber}`;

  await repository.addEvent({
    type: "set",
    payload: {
      path: `sessions.${sessionId}`,
      value: {
        messages: [{ role: "user", content: payload.message }],
        status: "ready",
        project: payload.project,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }
  });

  return repository.state.sessions[sessionId];
};
```

#### Query Operations Update
```javascript
// Before: SQL queries
const session = await libsqlDao.getViewBySessionId({ sessionId });
const sessions = await libsqlDao.getViewsByProjectId({ projectId });

// After: Memory state access
const session = repository.state.sessions[sessionId];
const sessions = Object.values(repository.state.sessions)
  .filter(s => s.project === projectId);
```

## Critical Implementation Requirement

### Database Creation Policy

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

// Task commands - these use createTaskDeps() with no database
taskCmd
  .command("create")
  .action(async (options) => {
    const taskDeps = createTaskDeps(); // Pure file-based operations
    const result = await createTask(taskDeps, options);
    // ... task logic using files only
  });
```

**Key Points**:
1. **Never call `createInsiemeRepository()` in task commands**
2. **Database existence check only happens inside `createInsiemeRepository()`**
3. **Task commands use `createTaskDeps()` with no database dependencies**
4. **CLI entry point remains database-agnostic**

This ensures users can use task functionality without any database setup, while session/project commands properly guide them to run `kanbatte db setup` first.

## Reference Implementation

See `routevn-creator-client` for a complete Insieme migration example:
- `src/deps/tauriRepositoryAdapter.js` - Tauri SQL adapter
- `src/deps/repository.js` - Repository factory pattern
- Simplified event schema with only `type` and `payload` fields