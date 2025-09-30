///TODO: Implement task_view functions

export async function appendEvent(db, entityId, eventData) {
  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), entityId, eventData, Date.now()],
  });
}
