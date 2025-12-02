export const addChannel = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { projectId, channelData } = payload;

  const eventData = serialize({
    type: "channel_created",
    projectId: projectId,
    data: channelData,
    timestamp: Date.now(),
  });

  await repository.addEvent({
    type: "treePush",
    partition: projectId,
    payload: {
      target: "events",
      value: { eventData },
      options: { parent: "_root" }
    }
  });

  await computeAndSaveView(deps, { id: projectId });
}

export const updateChannel = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { projectId, validUpdates } = payload;

  const eventData = serialize({
    type: "channel_updated",
    projectId: projectId,
    data: validUpdates,
    timestamp: Date.now(),
  });

  await repository.addEvent({
    type: "treePush",
    partition: projectId,
    payload: {
      target: "events",
      value: { eventData },
      options: { parent: "_root" }
    }
  });

  await computeAndSaveView(deps, { id: projectId });
}

export const fetchEventsByPartition = async (deps, payload) => {
  const { repository } = deps;
  const { partition } = payload;

  const result = await repository.getEventsAsync({ partition: [partition] });

  return result;
}

export const addSessionThreadRecord = async (deps, payload) => {
  const { db } = deps;
  const { sessionId, threadId } = payload;

  await db.execute({
    sql: "INSERT INTO discord_session_thread_record (session_id, thread_id) VALUES (?, ?)",
    args: [sessionId, threadId],
  });
}

export const getSessionIdByThread = async (deps, payload) => {
  const { db } = deps;
  const { threadId } = payload;

  const result = await db.execute({
    sql: "SELECT session_id FROM discord_session_thread_record WHERE thread_id = ?",
    args: [threadId],
  });

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0].session_id;
}

export const addUserEmailRecord = async (deps, payload) => {
  const { db } = deps;
  const { userId, name, email } = payload;

  await db.execute({
    sql: "INSERT OR REPLACE INTO discord_user_email_record (user_id, name, email) VALUES (?, ?, ?)",
    args: [userId, name, email],
  });
}

export const getInfoByUserId = async (deps, payload) => {
  const { db } = deps;
  const { userId } = payload;
  
  const result = await db.execute({
    sql: "SELECT name, email FROM discord_user_email_record WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    return null;
  }
  return {
    name: result.rows[0].name,
    email: result.rows[0].email,
  };
}

export const listUserEmailRecords = async (deps) => {
  const { db } = deps;
  
  const result = await db.execute({
    sql: "SELECT user_id, name, email FROM discord_user_email_record",
  });

  return result.rows.map(row => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
  }));
}

export const getThreadIdBySession = async (deps, payload) => {
  const { db } = deps;
  const { sessionId } = payload;

  const result = await db.execute({
    sql: "SELECT thread_id FROM discord_session_thread_record WHERE session_id = ?",
    args: [sessionId],
  });

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0].thread_id;
}

export const computeAndSaveView = async (deps, payload) => {
  const { db, generateId, deserialize, serialize } = deps;
  const { id } = payload;

  const events = await fetchEventsByPartition(deps, { partition: id });

  if (events.length === 0) {
    return null;
  }

  let state;
  let viewKey;
  let firstEvent = deserialize(events[0].payload.value.eventData);

  if (firstEvent.type === "channel_created") {
    state = {
      projectId: id,
      channel: "",
    };
    viewKey = `project:${id}`;
  }

  for (const row of events) {
    const event = deserialize(row.payload.value.eventData);

    switch (event.type) {
      case "channel_created":
        state.channel = event.data.channel || state.channel;
        state.createdAt = event.data.createdAt || state.createdAt;
        state.updatedAt = event.timestamp;
        break;

      case "channel_updated":
        if (event.data.project !== undefined) state.channel = event.data.channel;
        state.updatedAt = event.timestamp;
        break;

      default:
        break;
    }
  }

  const viewData = serialize(state);
  const now = Date.now();

  const existing = await db.execute({
    sql: "SELECT id FROM discord_view WHERE key = ?",
    args: [viewKey],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "UPDATE discord_view SET data = ?, updated_at = ? WHERE key = ?",
      args: [viewData, now, viewKey],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO discord_view (id, key, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: [generateId(), viewKey, viewData, now, now],
    });
  }

  return state;
};

export const listProjects = async (deps) => {
  const { db, deserialize } = deps;

  const result = await db.execute({
    sql: "SELECT key, data FROM discord_view WHERE key LIKE 'project:%' ORDER BY created_at ASC",
  });

  if (result.rows.length === 0) {
    return [];
  }

  return result.rows.map(row => {
    const data = deserialize(row.data);
    return {
      projectId: data.projectId,
      channel: data.channel,
    };
  });
}

export const getProjectIdByChannel = async (deps, payload) => {
  const { db, deserialize } = deps;
  const { channelId } = payload;

  const result = await db.execute({
    sql: "SELECT key, data FROM discord_view WHERE key LIKE 'project:%'",
  });

  for (const row of result.rows) {
    const data = deserialize(row.data);
    if (data.channel === channelId) {
      return data.projectId;
    }
  }

  return null;
}