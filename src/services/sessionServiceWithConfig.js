import { serialize, deserialize } from "../utils/serialization.js";

export const createSessionServiceWithConfig = (deps) => {
  const { insieme, libsqlInfra, configService } = deps;
  const { repository } = insieme;

  const _computeAndSaveView = async (id) => {
    const events = await repository.getEventsAsync({ partition: [id] });
    if (events.length === 0) return null;

    let state;
    let viewKey;
    let firstEvent = deserialize(events[0].payload.value.eventData);

    // Only sessions are stored in the database now
    // Projects are managed via config file
    const now = Date.now();
    state = { sessionId: id, messages: [], status: "ready", project: "", createdAt: now, updatedAt: now };
    viewKey = `session:${id}`;

    let lastEventId = null;
    for (const row of events) {
      lastEventId = row.id;
      const event = deserialize(row.payload.value.eventData);
      switch (event.type) {
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

  const fetchRecentSessionEvents = async (payload) => {
    const { lastOffsetId } = payload;
    const allEvents = await libsqlInfra.getAllEventsSince(lastOffsetId);
    return allEvents;
  };

  // Project management methods now use configService
  const getProjectById = async (payload) => {
    const { projectId } = payload;
    const project = configService.getProjectById(projectId);
    if (!project) return null;

    // Convert config format to expected format
    return {
      projectId: project.id,
      name: project.name || project.id,
      repository: project.gitRepository || "",
      description: project.description || ""
    };
  };

  const listProjects = async () => {
    const projects = configService.getProjects();
    // Convert config format to expected format
    return projects.map(p => ({
      projectId: p.id,
      name: p.name || p.id,
      repository: p.gitRepository || "",
      description: p.description || ""
    }));
  };

  const addProject = async (payload) => {
    const { projectId, projectData } = payload;
    const project = {
      id: projectId,
      name: projectData.name,
      gitRepository: projectData.repository,
      description: projectData.description
    };
    const result = configService.addProject(project);
    return {
      projectId: result.id,
      name: result.name || result.id,
      repository: result.gitRepository || "",
      description: result.description || ""
    };
  };

  const updateProject = async (payload) => {
    const { projectId, validUpdates } = payload;
    const updates = {};
    if (validUpdates.name !== undefined) updates.name = validUpdates.name;
    if (validUpdates.repository !== undefined) updates.gitRepository = validUpdates.repository;
    if (validUpdates.description !== undefined) updates.description = validUpdates.description;

    const result = configService.updateProject(projectId, updates);
    return {
      projectId: result.id,
      name: result.name || result.id,
      repository: result.gitRepository || "",
      description: result.description || ""
    };
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