const ensuredTables = new Set();

//DB Functions
///TODO: Implement task_view functions

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

//DB operations
async function appendEvent(db, type, entityId, payload, deps) {
  ensureEventTable(db);
  const { serialize, generateId } = deps;
  const eventId = generateId();
  const eventData = serialize({
    type,
    taskId: entityId,
    data: payload,
    timestamp: Date.now(),
  });

  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [eventId, entityId, eventData, Date.now()],
  });

  return eventId;
}

//CLI Functions

///TODO: Add mroe fucntions

export const createTask = async (deps, taskData) => {
  const { db, generateId } = deps;
  const taskId = taskData.taskId || generateId();

  const eventId = await appendEvent(db, "task_created", taskId, taskData, deps);

  return { taskId, ...taskData };
};
