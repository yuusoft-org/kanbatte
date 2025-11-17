export const appendSessionMessages = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { sessionId, messages } = payload;

  const messagesWithTimestamps = messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp || Date.now()
  }));

  const eventData = serialize({
    type: "session_append_messages",
    sessionId: sessionId,
    data: { messages: messagesWithTimestamps, timestamp: Date.now() },
    timestamp: Date.now()
  });

  await repository.addEvent({
    type: "treePush",
    partition: `session-${sessionId}`,
    payload: {
      target: `sessions.${sessionId}`,
      value: { entityId: sessionId, eventData }
    }
  });
  await computeAndSaveView(deps, { id: sessionId })
};

export const updateSessionStatus = async (deps, payload) => {
  const { repository, serialize } = deps;
  const { sessionId, status } = payload;

  const eventData = serialize({
    type: "session_updated",
    sessionId: sessionId,
    data: { status, timestamp: Date.now() },
    timestamp: Date.now()
  });

  await repository.addEvent({
    type: "treePush",
    partition: `session-${sessionId}`,
    payload: {
      target: `sessions.${sessionId}`,
      value: { entityId: sessionId, eventData }
    }
  });

  await computeAndSaveView(deps, { id: sessionId });
};

export const fetchEventsBySessionId = async (deps, payload) => {
  console.warn("Not supported query for now.");
}

export const computeAndSaveView = async (deps, payload) => {
  console.warn("Not supported query for now.");
};

export const getViewBySessionId = async (deps, payload) => {
  console.warn("Not supported query for now.");
};

export const getViewsByProjectId = async (deps, payload) => {
  console.warn("Not supported query for now.");
}

export const getNextSessionNumber = async (deps, payload) => {
  console.warn("Not supported query for now.");
}

export const getSessionsByStatus = async (deps, payload) => {
  console.warn("Not supported query for now.");
}

export const getProjectById = async (deps, payload) => {
  console.warn("Not supported query for now.");
}

export const listProjects = async (deps) => {
  console.warn("Not supported query for now.");
}
