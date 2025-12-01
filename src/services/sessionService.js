import { serialize, deserialize } from "../utils/serialization.js";

export const createSessionService = (deps) => {
  const { insieme, libsqlInfra } = deps;
  const { repository } = insieme;

  const _computeAndSaveView = async (id) => {
    const events = await repository.getEventsAsync({ partition: [id] });
    if (events.length === 0) return null;

    let state;
    let viewKey;
    let firstEvent = deserialize(events[0].payload.value.eventData);

    if (firstEvent.type === "project_created") {
      state = { projectId: id, name: "", repository: "", description: "" };
      viewKey = `project:${id}`;
    } else {
      const now = Date.now();
      state = { sessionId: id, messages: [], status: "ready", project: "", createdAt: now, updatedAt: now };
      viewKey = `session:${id}`;
    }

    let lastEventId = null;
    for (const row of events) {
      lastEventId = row.id;
      const event = deserialize(row.payload.value.eventData);
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
          if (event.data.messages) {
            state.messages.push(...event.data.messages);
          }
          state.updatedAt = event.timestamp;
          break;
      }
    }

    await libsqlInfra.setView(viewKey, state, lastEventId);
    return state;
  };

  const addSession = async (payload) => {
    const { sessionId, sessionData } = payload;
    const eventData = serialize({ type: "session_created", sessionId, data: sessionData, timestamp: Date.now() });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(sessionId);
  };

  const updateSession = async (payload) => {
    const { sessionId, validUpdates } = payload;
    const eventData = serialize({ type: "session_updated", sessionId, data: validUpdates, timestamp: Date.now() });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(sessionId);
  };

  const addProject = async (payload) => {
    const { projectId, projectData } = payload;
    const eventData = serialize({ type: "project_created", projectId, data: projectData, timestamp: Date.now() });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(projectId);
  };

  const updateProject = async (payload) => {
    const { projectId, validUpdates } = payload;
    const eventData = serialize({ type: "project_updated", projectId, data: validUpdates, timestamp: Date.now() });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(projectId);
  };

  const appendSessionMessages = async (payload) => {
    const { sessionId, messages } = payload;
    const messagesWithTimestamps = messages.map((msg) => ({ ...msg, timestamp: msg.timestamp || Date.now() }));
    const eventData = serialize({
      type: "session_append_messages",
      sessionId,
      data: { messages: messagesWithTimestamps, timestamp: Date.now() },
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    return await _computeAndSaveView(sessionId);
  };

  const updateSessionStatus = async (payload) => {
    const { sessionId, status } = payload;
    return await updateSession({ sessionId, validUpdates: { status } });
  };

  const getViewBySessionId = async (payload) => {
    const { sessionId } = payload;
    return await libsqlInfra.getView(`session:${sessionId}`);
  };

  const getViewsByProjectId = async (payload) => {
    const { projectId, statuses } = payload;
    const allSessions = await libsqlInfra.findViewsByPrefix(`session:${projectId}-`);
    if (!statuses || statuses.length === 0) {
      return allSessions;
    }
    return allSessions.filter((session) => statuses.includes(session.status));
  };

  const getNextSessionNumber = async (payload) => {
    const { projectId } = payload;
    const allSessions = await libsqlInfra.findViewsByPrefix(`session:${projectId}-`);
    if (allSessions.length === 0) {
      return 1;
    }
    const maxNumber = allSessions.reduce((max, session) => {
      const match = session.sessionId.match(/^.+-(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    return maxNumber + 1;
  };

  const getSessionsByStatus = async (payload) => {
    const { status } = payload;
    const allSessions = await libsqlInfra.findViewsByPrefix("session:");
    return allSessions.filter((session) => session.status === status);
  };

  const getProjectById = async (payload) => {
    const { projectId } = payload;
    return await libsqlInfra.getView(`project:${projectId}`);
  };

  const listProjects = async () => {
    return await libsqlInfra.findViewsByPrefix("project:");
  };

  const fetchRecentSessionEvents = async (payload) => {
    const { lastOffsetId } = payload;
    const allEvents = await repository.getEventsAsync({ lastOffsetId, filterInit: true });
    return allEvents.map((event) => ({
      ...deserialize(event.payload.value.eventData),
      id: event.id,
    }));
  };

  return {
    addSession,
    updateSession,
    addProject,
    updateProject,
    appendSessionMessages,
    updateSessionStatus,
    getViewBySessionId,
    getViewsByProjectId,
    getNextSessionNumber,
    getSessionsByStatus,
    getProjectById,
    listProjects,
    fetchRecentSessionEvents,
  };
};