///TODO: Implement task_view functions

//DB operations
async function appendEvent(db, type, entityId, payload, deps) {
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

//create task
export const createTask = async (deps, taskData) => {
  const { db, generateId } = deps;
  const taskId = taskData.taskId || generateId();

  const eventId = await appendEvent(db, "task_created", taskId, taskData, deps);

  return { taskId, ...taskData };
};

//get task by id
export const getTaskById = async (deps, taskId) => {
  const { db } = deps;

  const result = await db.execute({
    sql: "SELECT data FROM task_view WHERE key = ?",
    args: [`task:${taskId}`],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return deserialize(result.rows[0].data);
};

//update task
export const updateTask = async (deps, taskId, updates) => {
  const { db, serialize, generateId } = deps;

  const allowedUpdates = ["status", "title", "description"];
  const validUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key) && value !== undefined) {
      validUpdates[key] = value;
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    throw new Error("No valid updates provided");
  }

  const eventId = await appendEvent(
    db,
    "task_updated",
    taskId,
    validUpdates,
    deps,
  );

  return { taskId, ...validUpdates };
};
