export async function appendEvent(deps, payload) {
  const { db, generateId } = deps;
  const { entityId, eventData } = payload;

  await db.execute({
    sql: "INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)",
    args: [generateId(), entityId, eventData, Date.now()],
  });
}

export async function appendSessionMessage(deps, sessionId, message) {
  const { serialize } = deps;
  const eventData = serialize({
    type: "session_append_messages",
    sessionId: sessionId,
    data: { message, timestamp: Date.now() },
    timestamp: Date.now()
  });

  await appendEvent(deps, { entityId: sessionId, eventData });
  await computeAndSaveView(deps, { id: sessionId });
}

export async function updateSessionStatus(deps, sessionId, status) {
  const { serialize } = deps;
  const eventData = serialize({
    type: "session_updated",
    sessionId: sessionId,
    data: { status, timestamp: Date.now() },
    timestamp: Date.now()
  });

  await appendEvent(deps, { entityId: sessionId, eventData });
  await computeAndSaveView(deps, { id: sessionId });
}

export async function fetchEventsBySessionId(deps, sessionId) {
  const { db } = deps;

  const result = await db.execute({
    sql: "SELECT id, data, created_at FROM event_log WHERE key = ? ORDER BY created_at ASC",
    args: [sessionId],
  });

  return result.rows;
}

export async function computeAndSaveView(deps, payload) {
  const { db, generateId, deserialize, serialize } = deps;
  const { id } = payload;

  const events = await fetchEventsBySessionId(deps, id);

  if (events.length === 0) {
    return null;
  }

  let state;
  let viewKey;
  let firstEvent = deserialize(events[0].data);

  if (firstEvent.type === "project_created") {
    state = {
      projectId: id,
      name: "",
      repository: "",
      description: "",
    };
    viewKey = `project:${id}`;
  } else {
    const now = Date.now();
    state = {
      sessionId: id,
      messages: [],
      status: "ready",
      project: "",
      createdAt: now,
      updatedAt: now,
    };
    viewKey = `session:${id}`;
  }

  let lastEventId = null;

  for (const row of events) {
    lastEventId = row.id;
    const event = deserialize(row.data);

    switch (event.type) {
      case "project_created":
        state.projectId = event.data.projectId;
        state.name = event.data.name;
        state.repository = event.data.repository;
        state.description = event.data.description;
        break;

      case "session_created":
        state.messages = event.data.messages || state.messages;
        state.status = event.data.status || state.status;
        state.project = event.data.project || state.project;
        state.createdAt = event.data.createdAt || state.createdAt;
        state.updatedAt = event.timestamp;
        break;

      case "session_updated":
        if (event.data.messages !== undefined) state.messages = event.data.messages;
        if (event.data.status !== undefined) state.status = event.data.status;
        if (event.data.project !== undefined) state.project = event.data.project;
        state.updatedAt = event.timestamp;
        break;

      case "session_append_messages":
        if (event.data.message) {
          state.messages.push(event.data.message);
        }
        state.updatedAt = event.timestamp;
        break;
    }
  }

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

export async function getViewBySessionId(deps, sessionId) {
  const { db, deserialize } = deps;

  const result = await db.execute({
    sql: "SELECT data FROM view WHERE key = ?",
    args: [`session:${sessionId}`],
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
    args: [`session:${projectId}-%`],
  });

  if (result.rows.length === 0) {
    return [];
  }

  const sessions = result.rows
    .map((row) => deserialize(row.data))
    .filter((session) => {
      if (!statuses || statuses.length === 0) return true;
      return statuses.includes(session.status);
    });

  return sessions;
}

export async function getNextSessionNumber(deps, projectId) {
  const { db } = deps;

  const result = await db.execute({
    sql: "SELECT key FROM view WHERE key LIKE ? ORDER BY created_at DESC LIMIT 1",
    args: [`session:${projectId}-%`],
  });

  if (result.rows.length === 0) {
    return 1;
  }

  const latestKey = result.rows[0].key;
  const match = latestKey.match(/^session:(.+)-(\d+)$/);

  if (!match) {
    return 1;
  }

  return parseInt(match[2], 10) + 1;
}

export async function getSessionsByStatus(deps, status) {
  const { db, deserialize } = deps;

  const result = await db.execute({
    sql: "SELECT data FROM view WHERE key LIKE ?",
    args: ["session:%"],
  });

  if (result.rows.length === 0) {
    return [];
  }

  const sessions = result.rows
    .map((row) => deserialize(row.data))
    .filter((session) => session.status === status);

  return sessions;
}

export async function getProjectById(deps, projectId) {
  const { db, deserialize } = deps;

  const result = await db.execute({
    sql: "SELECT data FROM view WHERE key = ?",
    args: [`project:${projectId}`],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return deserialize(result.rows[0].data);
}
