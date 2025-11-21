export const addChannel = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { channelId, channelData } = payload;

  const eventData = serialize({
    type: "channel_created",
    channelId: channelId,
    data: channelData,
    timestamp: Date.now(),
  });

  await repository.addEvent({
    type: "treePush",
    partition: channelId,
    payload: {
      target: "events",
      value: { eventData },
      options: { parent: "_root" }
    }
  });

  await computeAndSaveView(deps, { id: channelId });
}

export const updateChannel = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { channelId, validUpdates } = payload;

  const eventData = serialize({
    type: "channel_updated",
    channelId: channelId,
    data: validUpdates,
    timestamp: Date.now(),
  });

  await repository.addEvent({
    type: "treePush",
    partition: channelId,
    payload: {
      target: "events",
      value: { eventData },
      options: { parent: "_root" }
    }
  });

  await computeAndSaveView(deps, { id: channelId });
}

export const fetchEventsByPartition = async (deps, payload) => {
  const { repository } = deps;
  const { partition } = payload;

  const result = await repository.getEventsAsync({ partition: [partition] });

  return result;
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
      channelId: id,
      project: "",
    };
    viewKey = `channel:${id}`;
  }

  let lastEventId = null;

  for (const row of events) {
    lastEventId = row.id;
    const event = deserialize(row.payload.value.eventData);

    switch (event.type) {
      case "channel_created":
        state.project = event.data.project || state.project;
        state.createdAt = event.data.createdAt || state.createdAt;
        state.updatedAt = event.timestamp;
        break;

      case "channel_updated":
        if (event.data.project !== undefined) state.project = event.data.project;
        state.updatedAt = event.timestamp;
        break;

      default:
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
      sql: "UPDATE discord_view SET data = ?, last_offset_id = ?, updated_at = ? WHERE key = ?",
      args: [viewData, lastEventId, now, viewKey],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO discord_view (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [generateId(), viewKey, viewData, lastEventId, now, now],
    });
  }

  return state;
};