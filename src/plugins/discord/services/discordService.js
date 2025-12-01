import { serialize, deserialize } from "../../../utils/serialization.js";

export const createDiscordService = (deps) => {
  const { discordInsieme, discordLibsql } = deps;
  const { repository } = discordInsieme;

  const _computeAndSaveView = async (id) => {
    const events = await repository.getEventsAsync({ partition: [id] });
    if (events.length === 0) return null;

    let state;
    let viewKey;
    let firstEvent = deserialize(events[0].payload.value.eventData);

    if (firstEvent.type === "channel_created") {
      state = { projectId: id, channel: "" };
      viewKey = `project:${id}`;
    } else {
      return null;
    }

    for (const row of events) {
      const event = deserialize(row.payload.value.eventData);
      switch (event.type) {
        case "channel_created":
          state.channel = event.data.channel || state.channel;
          break;
        case "channel_updated":
          if (event.data.channel !== undefined) state.channel = event.data.channel;
          break;
      }
    }

    await discordLibsql.setView(viewKey, state);
    return state;
  };

  const addChannel = async (payload) => {
    const { projectId, channelData } = payload;
    const eventData = serialize({ type: "channel_created", projectId, data: channelData, timestamp: Date.now() });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(projectId);
  };

  const updateChannel= async (payload) => {
    const { projectId, validUpdates } = payload;
    const eventData = serialize({ type: "channel_updated", projectId, data: validUpdates, timestamp: Date.now() });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(projectId);
  };

  const listProjects = async () => {
    const views = await discordLibsql.findViewsByPrefix("project:");
    return views.map(data => ({
      projectId: data.projectId,
      channel: data.channel,
    }));
  };

  const getProjectIdByChannel = async (payload) => {
    const { channelId } = payload;
    const projects = await discordLibsql.findViewsByPrefix("project:");
    const project = projects.find(p => p.channel === channelId);
    return project ? project.projectId : null;
  };

  const addSessionThreadRecord = async (payload) => {
    return await discordLibsql.addSessionThreadRecord(payload);
  };

  const getSessionIdByThread = async (payload) => {
    return await discordLibsql.getSessionIdByThread(payload);
  };

  const getThreadIdBySession = async (payload) => {
    return await discordLibsql.getThreadIdBySession(payload);
  };

  return {
    addChannel,
    updateChannel,
    listProjects,
    getProjectIdByChannel,
    addSessionThreadRecord,
    getSessionIdByThread,
    getThreadIdBySession,
  };
};