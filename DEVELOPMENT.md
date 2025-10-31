# Kanbatte Development Guide

## Tech Stack

### Runtime
- **[Bun](https://bun.com/)** - JavaScript runtime (instead of Node.js)
  - Fast startup and execution
  - Built-in TypeScript support
  - Native SQLite support

### CLI Framework
- **[Commander.js](https://github.com/tj/commander.js)** - Command-line interface framework
  - Declarative command definitions
  - Automatic help generation
  - Option parsing

### Database
- **SQLite/LibSQL** via [`@libsql/client`](https://www.npmjs.com/package/@libsql/client) (v0.14.0)
  - Local-first database
  - Zero configuration
  - ACID compliant

### Data Serialization
- **[MessagePack](https://msgpack.org)** - Binary serialization format
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
- Sessions: `session:{sessionId}` (e.g., `session:jfk32jlasd1`)

## Event Types

Events are stored as MessagePack-encoded JSON with the following structure:

```javascript
{
    type: 'session_created' | 'session_append' | 'session_update',
    taskId: 'string',
    data: {} // Event-specific payload
}
```

Example event:
```json
{
    "type": "session_created",
    "id": "f3kj2383",
    "data": {
      ...
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
bun run src/cli.js task list
```


### Testing

- Testing of logic and functions should use https://github.com/yuusoft-org/puty
- Testing of logic that involve file system should use `puty` and `memfs`, refer to https://github.com/yuusoft-org/rettangoli/tree/main/packages/rettangoli-sites/spec
- The above should test the functions directly, not the cli commands
- For cli commands, we don't test this layer for now, maybe we will add later.








