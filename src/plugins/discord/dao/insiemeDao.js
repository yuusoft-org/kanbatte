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

export const updateLastOffsetId = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { lastOffsetId } = payload;

  const eventData = serialize({
    type: "last_offset_updated",
    data: { lastOffsetId },
    timestamp: Date.now(),
  });
  
  await repository.addEvent({
    type: "treePush",
    partition: "last_offset_id",
    payload: {
      target: "events",
      value: { eventData },
      options: { parent: "_root" }
    }
  });
}

export const getLastOffsetId = async (deps) => {
  const { repository, deserialize } = deps;
  
  const result = await repository.getEventsAsync({ partition: ["last_offset_id"] });
  if (result.length === 0) {
    return null;
  }
  
  const lastEvent = result[result.length - 1];
  const event = deserialize(lastEvent.payload.value.eventData);
  return event.data.lastOffsetId;
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
      projectId: id,
      channels: "",
    };
    viewKey = `project:${id}`;
  }

  let lastEventId = null;

  for (const row of events) {
    lastEventId = row.id;
    const event = deserialize(row.payload.value.eventData);

    switch (event.type) {
      case "channel_created":
        state.channels = event.data.channels || state.channels;
        state.createdAt = event.data.createdAt || state.createdAt;
        state.updatedAt = event.timestamp;
        break;

      case "channel_updated":
        if (event.data.project !== undefined) state.channels = event.data.channels;
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