import { serialize, generateId, createEvent } from "../utils/serialization.js";

const ensuredTables = new Set();

//DB Functions

async function ensureEventTable(db) {
  const tableName = "event_log";
  if (ensuredTables.has(tableName)) return;

  await db.execute(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        data BLOB NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  ensuredTables.add(tableName);
}
async function ensureTaskTable(db) {
  const tableName = "task_view";
  if (ensuredTables.has(tableName)) return;

  await db.execute(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        data BLOB NOT NULL,
        last_offset_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  ensuredTables.add(tableName);
}

//DB operations
async function appendEvent(db, type, entityId, payload) {
  ensureEventTable(db);
  const eventId = generateId();
  const eventData = createEvent(type, entityId, payload);

  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [eventId, entityId, serialize(eventData), Date.now()],
  });

  return eventId;
}

async function upsertView(
  db,
  table,
  { id, key, data, eventId, createdAt, updatedAt }
) {
  ensureTaskTable(db);
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${table} 
          (id, key, data, last_offset_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, key, serialize(data), eventId, createdAt, updatedAt],
  });
}

//CLI Functions

///TODO: Add mroe fucntions

export const createTask = async (deps, taskData) => {
  const { db } = deps;
  const taskId = taskData.taskId || generateId();

  const eventId = await appendEvent(db, "task_created", taskId, taskData);

  const viewData = {
    id: taskId,
    title: taskData.title,
    description: taskData.description ?? "",
    status: taskData.status ?? "ready",
    projectId: taskData.projectId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await upsertView(db, "task_view", {
    id: taskId,
    key: `task:${taskId}`,
    data: viewData,
    eventId,
    createdAt: viewData.createdAt,
    updatedAt: viewData.updatedAt,
  });

  return { taskId, ...viewData };
};
