///TODO: Implement task_view functions

export async function appendEvent(deps, payload) {
  const { db, generateId } = deps;
  const { entityId, eventData } = payload;

  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [generateId(), entityId, eventData, Date.now()],
  });
}
