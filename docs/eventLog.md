# Event Log and View Table Architecture

## Overview

Kanbatte uses an event sourcing pattern with two complementary database tables that work together to provide both a complete audit trail and fast query performance.

## The Two-Table System

### 1. Event Log Table (`event_log`)
The **event log** is an append-only table that stores the complete history of all changes. Think of it as an immutable journal where every action is recorded forever.

- **Purpose**: Source of truth, audit trail, time-travel capabilities
- **Characteristics**: 
  - Append-only (never updated or deleted)
  - Contains full history of every change
  - Each row represents a single event/action
  - Events are immutable once written

### 2. View Table (`view`)
The **view table** is a materialized view that stores only the current state of each entity. It's derived from the event log and optimized for fast reads.

- **Purpose**: Fast queries, current state representation
- **Characteristics**:
  - Contains only the latest/end state
  - Updated whenever new events are processed
  - One row per entity (task, comment, etc.)
  - Optimized for read performance

## How They Work Together

```
┌─────────────┐         ┌─────────────┐
│  Event Log  │────────▶│    View     │
│  (History)  │ Process │ (Current)   │
└─────────────┘         └─────────────┘
```

1. **Write Flow**: When a user creates or modifies a task:
   - An event is appended to the `event_log` table
   - The system processes this event and updates the `view` table

2. **Read Flow**: When querying current data:
   - Queries go directly to the `view` table for fast access
   - No need to replay events for simple reads

## Example: Task Lifecycle

Let's trace how a task flows through both tables:

### Step 1: Create Task
```
Event Log:
- Event: task_created (AI-001, "Research ML models")

View:
- New row: AI-001 with current state
```

### Step 2: Update Status
```
Event Log:
- Event: task_created (AI-001, "Research ML models")
- Event: task_updated (AI-001, status: "in_progress")  ← New event added

View:
- Row AI-001 updated with new status  ← Same row updated
```

### Step 3: Add Comment
```
Event Log:
- Event: task_created (AI-001, "Research ML models")
- Event: task_updated (AI-001, status: "in_progress")
- Event: comment_added (AI-001, "Started research")  ← New event added

View:
- Row AI-001 remains (task state unchanged)
- New row: CM-123 for the comment  ← New row for comment entity
```

## Benefits of This Architecture

### 1. Complete Audit Trail
Every change is preserved in the event log, enabling:
- Full history tracking
- Debugging and troubleshooting
- Compliance and auditing
- Time-travel queries (future feature)

### 2. Performance
The view table provides:
- Fast queries without event replay
- Indexed current state
- Efficient filtering and sorting

### 3. Data Integrity
- Event log is immutable (no data loss)
- View can be rebuilt from events if needed
- Natural backup via event history

### 4. Flexibility
- Easy to add new projections/views
- Can replay events with different logic
- Supports complex business rules

## Key Concepts for Newcomers

1. **Think in Events**: Instead of thinking "update the task status", think "record that the status changed"

2. **Two Perspectives**: 
   - Event log = "What happened?" (history)
   - View = "What is?" (current state)

3. **Source of Truth**: The event log is always the source of truth. The view is just a cached representation that can be rebuilt.

4. **Event Immutability**: Once an event is written, it's never changed. Corrections are made by adding new events.

This pattern is common in financial systems, distributed systems, and anywhere audit trails are important. It trades some write complexity for significant benefits in data integrity, history tracking, and read performance.

## Read More: Related Concepts

To deepen your understanding of this architecture, explore these related patterns and concepts:

### Core Patterns
- **Event Sourcing** - The pattern of storing state as a sequence of events
  - [Martin Fowler's Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)

- **CQRS (Command Query Responsibility Segregation)** - Separating read and write models
  - [CQRS by Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
  - [CQRS Pattern - Microsoft](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)

