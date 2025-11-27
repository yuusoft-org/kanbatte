import { serialize, deserialize } from "../utils/serialization.js";
import { generateId } from "../utils/helper.js";

export const createSessionService = (deps) => {
  const { libsqlService, insiemeService } = deps;
  const { repository } = insiemeService;

  const _fetchEventsByPartition = async (partition) => {
    const result = await repository.getEventsAsync({ partition: [partition] });
    return result;
  };

  const _computeAndSaveView = async (id) => {
    const db = await libsqlService.getClient();
    const events = await _fetchEventsByPartition(id);

    if (events.length === 0) {
      return null;
    }

    let state;
    let viewKey;
    let firstEvent = deserialize(events[0].payload.value.eventData);

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
            for (const msg of event.data.messages) {
              state.messages.push(msg);
            }
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
  };

  const addSession = async (payload) => {
    const { sessionId, sessionData } = payload;
    const eventData = serialize({
      type: "session_created",
      sessionId: sessionId,
      data: sessionData,
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(sessionId);
  };

  const updateSession = async (payload) => {
    const { sessionId, validUpdates } = payload;
    const eventData = serialize({
      type: "session_updated",
      sessionId: sessionId,
      data: validUpdates,
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(sessionId);
  };

  const addProject = async (payload) => {
    const { projectId, projectData } = payload;
    const eventData = serialize({
      type: "project_created",
      projectId: payload.projectId,
      data: projectData,
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(projectId);
  };

  const updateProject = async (payload) => {
    const { projectId, validUpdates } = payload;
    const eventData = serialize({
      type: "project_updated",
      projectId: projectId,
      data: validUpdates,
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(projectId);
  };

  const appendSessionMessages = async (payload) => {
    const { sessionId, messages } = payload;
    const messagesWithTimestamps = messages.map((msg) => ({ ...msg, timestamp: msg.timestamp || Date.now() }));
    const eventData = serialize({
      type: "session_append_messages",
      sessionId: sessionId,
      data: { messages: messagesWithTimestamps, timestamp: Date.now() },
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(sessionId);
  };

  const updateSessionStatus = async (payload) => {
    const { sessionId, status } = payload;
    const eventData = serialize({
      type: "session_updated",
      sessionId: sessionId,
      data: { status, timestamp: Date.now() },
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: sessionId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(sessionId);
  };

  const getViewBySessionId = async (payload) => {
    const db = await libsqlService.getClient();
    const { sessionId } = payload;
    const result = await db.execute({
      sql: "SELECT data FROM view WHERE key = ?",
      args: [`session:${sessionId}`],
    });
    if (result.rows.length === 0) return null;
    return deserialize(result.rows[0].data);
  };

  const getViewsByProjectId = async (payload) => {
    const db = await libsqlService.getClient();
    const { projectId, statuses } = payload;
    const result = await db.execute({
      sql: "SELECT data FROM view WHERE key LIKE ?",
      args: [`session:${projectId}-%`],
    });
    if (result.rows.length === 0) return [];
    const sessions = result.rows.map((row) => deserialize(row.data)).filter((session) => {
      if (!statuses || statuses.length === 0) return true;
      return statuses.includes(session.status);
    });
    return sessions;
  };

  const getNextSessionNumber = async (payload) => {
    const db = await libsqlService.getClient();
    const { projectId } = payload;
    const result = await db.execute({
      sql: "SELECT key FROM view WHERE key LIKE ? ORDER BY created_at DESC LIMIT 1",
      args: [`session:${projectId}-%`],
    });
    if (result.rows.length === 0) return 1;
    const latestKey = result.rows[0].key;
    const match = latestKey.match(/^session:(.+)-(\d+)$/);
    if (!match) return 1;
    return parseInt(match[2], 10) + 1;
  };

  const getSessionsByStatus = async (payload) => {
    const db = await libsqlService.getClient();
    const { status } = payload;
    const result = await db.execute({
      sql: "SELECT data FROM view WHERE key LIKE ?",
      args: ["session:%"],
    });
    if (result.rows.length === 0) return [];
    const sessions = result.rows.map((row) => deserialize(row.data)).filter((session) => session.status === status);
    return sessions;
  };

  const getProjectById = async (payload) => {
    const db = await libsqlService.getClient();
    const { projectId } = payload;
    const result = await db.execute({
      sql: "SELECT data FROM view WHERE key = ?",
      args: [`project:${projectId}`],
    });
    if (result.rows.length === 0) return null;
    return deserialize(result.rows[0].data);
  };

  const listProjects = async () => {
    const db = await libsqlService.getClient();
    const result = await db.execute({
      sql: "SELECT key, data FROM view WHERE key LIKE 'project:%' ORDER BY created_at ASC",
    });
    if (result.rows.length === 0) return [];
    return result.rows.map((row) => {
      const data = deserialize(row.data);
      return {
        projectId: data.projectId,
        name: data.name,
        repository: data.repository,
        description: data.description,
      };
    });
  };

  const fetchRecentSessionEvents = async (payload) => {
    const { lastOffsetId } = payload;
    const allEvents = await repository.getEventsAsync({ lastOffsetId, filterInit: true });
    return allEvents.map((event) => ({
      ...event,
      eventData: deserialize(event.payload.value.eventData),
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