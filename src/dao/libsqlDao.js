///TODO: Implement task_view functions

//DB operations
export async function appendEvent(db, entityId, eventData) {
  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), entityId, eventData, Date.now()],
  });
}

//get task by id
// export const getTaskById = async (deps, taskId) => {
//   const { db, deserialize } = deps;

//   const result = await db.execute({
//     sql: "SELECT data FROM task_view WHERE key = ?",
//     args: [`task:${taskId}`],
//   });

//   if (result.rows.length === 0) {
//     return null;
//   }

//   return deserialize(result.rows[0].data);
// };
