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

#### 1. Create Partitioned Insieme Storage Adapter
**File**: `src/adapters/partitionedInsiemeAdapter.js` (new)

```javascript
import { createClient } from "@libsql/client";
import { decode, encode } from "@msgpack/msgpack";

export const createPartitionedInsiemeAdapter = async (dbPath, deps) => {
  const db = createClient({ url: `file:${dbPath}` });

  // Helper function to extract partition from Insieme events
  const extractPartition = (event) => {
    if (event.type === 'set' && event.payload?.path) {
      const path = event.payload.path;
      if (path.startsWith('sessions.')) {
        const sessionId = path.split('.')[1];
        return `session-${sessionId}`;
      }
      if (path.startsWith('projects.')) {
        const projectId = path.split('.')[1];
        return `project-${projectId}`;
      }
    }
    return 'default';
  };

  // Incremental update of materialized view for a partition
  const updateMaterializedView = async (partition) => {
    // Get current materialized view state
    const currentView = await db.execute({
      sql: "SELECT state, last_event_id FROM materialized_views WHERE partition = ?",
      args: [partition]
    });

    // Get only new events for this partition
    const lastEventId = currentView.rows[0]?.last_event_id || 0;
    const newEvents = await db.execute({
      sql: "SELECT type, payload FROM events WHERE partition = ? AND id > ? ORDER BY id",
      args: [partition, lastEventId]
    });

    if (newEvents.rows.length === 0) return;

    // Apply new events to current state
    let currentState = currentView.rows[0] ?
      decode(currentView.rows[0].state) : {};

    for (const eventRow of newEvents.rows) {
      const event = {
        type: eventRow.type,
        payload: decode(eventRow.payload)
      };
      currentState = applyInsiemeEventToState(currentState, event);
    }

    // Update materialized view
    const finalEventId = newEvents.rows[newEvents.rows.length - 1].id;
    await db.execute({
      sql: `INSERT OR REPLACE INTO materialized_views
            (partition, state, last_event_id, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [partition, encode(currentState), finalEventId]
    });
  };

  // Apply Insieme event to state (simplified implementation)
  const applyInsiemeEventToState = (state, event) => {
    if (event.type === 'set' && event.payload?.path) {
      const pathParts = event.payload.path.split('.');
      let current = state;

      // Navigate to parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }

      // Set the value
      current[pathParts[pathParts.length - 1]] = event.payload.value;
    }
    return state;
  };

  return {
    // Insieme store interface - optimized for partitioning
    async getEvents() {
      // Get all current partition states from materialized views
      const partitionStates = await db.execute(
        "SELECT partition, state FROM materialized_views"
      );

      // Return an init event with all partition states
      const initialState = {};
      for (const row of partitionStates.rows) {
        const partition = row.partition;
        const state = decode(row.state);

        // Merge partition state into global state
        if (partition.startsWith('session-')) {
          const sessionId = partition.replace('session-', '');
          initialState.sessions = initialState.sessions || {};
          initialState.sessions[sessionId] = state;
        } else if (partition.startsWith('project-')) {
          const projectId = partition.replace('project-', '');
          initialState.projects = initialState.projects || {};
          initialState.projects[projectId] = state;
        }
      }

      return [{
        type: "init",
        payload: { value: initialState }
      }];
    },

    async appendEvent(event) {
      const partition = extractPartition(event);
      const serializedPayload = encode(event.payload);

      // Insert event with partition
      await db.execute({
        sql: "INSERT INTO events (partition, type, payload) VALUES (?, ?, ?)",
        args: [partition, event.type, serializedPayload]
      });

      // Update materialized view for this partition
      await updateMaterializedView(partition);
    }
  };
};
```

#### 2. Update CLI Entry Point
**File**: `src/cli.js` (modify)

```javascript
import { createRepository } from "insieme";
import { createPartitionedInsiemeAdapter } from "./adapters/partitionedInsiemeAdapter.js";
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

  // Create partitioned storage adapter instead of simple libsql store
  const store = await createPartitionedInsiemeAdapter(dbPath, {
    generateId,
    serialize,
    deserialize
  });

  const repository = createRepository({ originStore: store });

  // Initialize with flat state structure (no tree needed)
  // Materialized views will provide the actual state during initialization
  await repository.init({
    initialState: {
      sessions: {},
      projects: {}
    }
  });

  return repository;
};

// Task commands currently don't use dependency injection, but will need it
// See tasks/TASK/000/TASK-008.md for the planned dependency injection refactor
// Current: createTask(projectRoot, options)
// Planned: createTask(deps, projectRoot, options)
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

#### Create Materialized Views Migration
**File**: `db/migrations/003-create-materialized-views.sql` (new)

```sql
-- Migration for materialized views to store partition states
CREATE TABLE IF NOT EXISTS materialized_views (
    partition TEXT PRIMARY KEY,
    state BLOB,
    last_event_id INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_materialized_views_updated ON materialized_views(updated_at);
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
5. **Task dependency injection will be handled by TASK-008**

This ensures users can use task functionality without any database setup, while session/project commands properly guide them to run `kanbatte db setup` first.

## Reference Implementation

See `routevn-creator-client` for basic Insieme integration patterns:
- `src/deps/tauriRepositoryAdapter.js` - Tauri SQL adapter (basic version)
- `src/deps/repository.js` - Repository factory pattern

**Kanbatte Implementation**: Enhanced with partitioning and materialized views for enterprise-scale data handling.