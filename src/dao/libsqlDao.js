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
  try {
    await db.execute({
      sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
      args: [eventId, entityId, eventData, Date.now()],
    });

    return eventId;
  } catch (e) {
    console.error("Failed to create task:", e.message);
    console.info("Run kanbatte setup db command to setup your database");
  }
}

//CLI Functions

///TODO: Add mroe fucntions

export const createTask = async (deps, taskData) => {
  const { db, generateId } = deps;
  const taskId = taskData.taskId || generateId();

  const eventId = await appendEvent(db, "task_created", taskId, taskData, deps);

  return { taskId, ...taskData };
};
