# Kanbatte Development Guide

## Tech Stack

### Runtime
- **Bun** - JavaScript runtime (instead of Node.js)
  - Fast startup and execution
  - Built-in TypeScript support
  - Native SQLite support

### CLI Framework
- **Commander.js** - Command-line interface framework
  - Declarative command definitions
  - Automatic help generation
  - Option parsing

### Database
- **SQLite/LibSQL** via `@libsql/client` (v0.14.0)
  - Local-first database
  - Zero configuration
  - ACID compliant

### Data Serialization
- **MessagePack** - Binary serialization format
  - Compact binary representation
  - Faster than JSON
  - Preserves type information

## Database Architecture

The system uses a CQRS-inspired event sourcing pattern with two tables:

### 1. Event Log Table (`event_log`)
Append-only event stream that serves as the source of truth.

```sql
CREATE TABLE event_log (
    id TEXT PRIMARY KEY,        -- UUID
    key TEXT NOT NULL,          -- taskId for filtering/partitioning
    data BLOB NOT NULL,         -- MessagePack binary of JSON data
    created_at INTEGER NOT NULL -- Unix timestamp
);

CREATE INDEX idx_event_log_key ON event_log(key);
CREATE INDEX idx_event_log_created_at ON event_log(created_at);
```

### 2. Computed View Table (`view`)
Materialized view derived from the event log for fast queries.

```sql
CREATE TABLE view (
    id TEXT PRIMARY KEY,    -- UUID
    key TEXT NOT NULL,      -- Type-specific key (e.g., 'task:AI-001', 'comment:CM-123')
    data BLOB NOT NULL,     -- MessagePack binary of current state
    last_offset_id TEXT NOT NULL,  -- UUID of last event_log entry that modified this view
    created_at INTEGER NOT NULL,   -- Unix timestamp (first creation)
    updated_at INTEGER NOT NULL    -- Unix timestamp (last update)
);

CREATE INDEX idx_view_key ON view(key);
CREATE INDEX idx_view_updated_at ON view(updated_at);
```

Key patterns:
- Tasks: `task:{taskId}` (e.g., `task:AI-001`)
- Comments: `comment:{commentId}` (e.g., `comment:CM-123`)
- Followups: `followup:{followupId}` (e.g., `followup:FU-456`)

## Event Types

Events are stored as MessagePack-encoded JSON with the following structure:

```javascript
{
    type: 'task_created' | 'task_updated' | 'comment_added' | 'followup_added' | 'followup_updated',
    taskId: 'string',
    data: {} // Event-specific payload
}
```

Example event:
```json
{
    "type": "task_created",
    "taskId": "AI-001",
    "data": {
        "title": "Research ML models",
        "description": "Investigate latest transformer architectures",
        "status": "ready"
    }
}
```

## Coding Conventions

### File Structure
```
kanbatte/
├── src/
│   ├── cli.js         # CLI entry point with Commander.js setup
│   ├── commands.js    # Command implementations
│   └── dao/
│       └── libsqlDao.js  # Database access layer
├── docs/
│   └── roadmap.md     # Project roadmap
├── CLI.md             # CLI documentation
├── DEVELOPMENT.md     # This file
├── README.md          # User documentation
└── package.json       # Dependencies and scripts
```

### Development Setup

1. Install dependencies:
```bash
bun install
```

2. Quick test: ``
```
bun run src/cli.js new task -t hi
```
