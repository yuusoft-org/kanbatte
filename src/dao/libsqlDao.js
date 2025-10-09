export async function appendEvent(deps, payload) {
  const { db, generateId } = deps;
  const { entityId, eventData } = payload;

  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [generateId(), entityId, eventData, Date.now()],
  });
}

export async function fetchEventsByTaskId(deps, taskId) {
  const { db } = deps;

  const result = await db.execute({
    sql: "SELECT id, data, created_at FROM event_log WHERE key = ? ORDER BY created_at ASC",
    args: [taskId],
  });

  return result.rows;
}

export async function computeAndSaveView(deps, payload) {
  const { db, generateId, deserialize, serialize } = deps;
  const { taskId } = payload;

  const events = await fetchEventsByTaskId(deps, taskId);

  if (events.length === 0) {
    return null;
  }

  const state = {
    taskId: taskId,
    title: "",
    description: "",
    status: "todo",
    projectId: "",
    comments: [],
    followups: [],
  };

  let lastEventId = null;

  // Replay events to compute current state
  for (const row of events) {
    lastEventId = row.id;
    const event = deserialize(row.data);

    switch (event.type) {
      case "task_created":
        state.title = event.data.title;
        state.description = event.data.description;
        state.status = event.data.status;
        state.projectId = event.data.projectId;
        break;

      case "task_updated":
        if (event.data.title !== undefined) state.title = event.data.title;
        if (event.data.description !== undefined)
          state.description = event.data.description;
        if (event.data.status !== undefined) state.status = event.data.status;
        break;

      case "comment_added":
        state.comments.push({
          commentId: event.data.commentId,
          content: event.data.content,
          timestamp: event.timestamp,
        });
        break;

      case "followup_added":
        state.followups.push({
          followupId: event.data.followupId,
          content: event.data.content,
          timestamp: event.timestamp,
        });
        break;
    }
  }

  const viewKey = `task:${taskId}`;
  const viewData = serialize(state);
  const now = Date.now();

  const existing = await db.execute({
    sql: "SELECT id FROM view WHERE key = ?",
    args: [viewKey],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "UPDATE view SET data = ?, last_offset_id = ?, updated_at = ? WHERE key = ?",
      args: [viewData, lastEventId, now, viewKey],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO view (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [generateId(), viewKey, viewData, lastEventId, now, now],
    });
  }

  return state;
}

export async function getViewByTaskId(deps, taskId) {
  const { db, deserialize } = deps;

  const result = await db.execute({
    sql: "SELECT data FROM view WHERE key = ?",
    args: [`task:${taskId}`],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return deserialize(result.rows[0].data);
}

export async function getViewsByProjectId(deps, payload) {
  const { db, deserialize } = deps;
  const { projectId, statuses } = payload;

  const result = await db.execute({
    sql: "SELECT data FROM view WHERE key LIKE ?",
    args: [`task:${projectId}-%`],
  });

  if (result.rows.length === 0) {
    return [];
  }

  const tasks = result.rows
    .map((row) => deserialize(row.data))
    .filter((task) => {
      if (!statuses || statuses.length === 0) return true;
      return statuses.includes(task.status);
    });

  return tasks;
}

export async function getNextTaskNumber(deps, projectId) {
  const { db } = deps;

  const result = await db.execute({
    sql: "SELECT key FROM view WHERE key LIKE ? ORDER BY created_at DESC LIMIT 1",
    args: [`task:${projectId}-%`],
  });

  if (result.rows.length === 0) {
    return 1;
  }

  const latestKey = result.rows[0].key;
  const match = latestKey.match(/^task:[A-Z]+-(\d+)$/);

  if (!match) {
    return 1;
  }

  return parseInt(match[1], 10) + 1;
}
