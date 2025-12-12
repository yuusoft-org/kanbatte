export const createSessionCommands = (deps) => {
  const { sessionService, formatOutput, configService } = deps;

  const addSession = async (payload) => {
    if (!payload.message) {
      throw new Error("Session message is required (provide message as argument)");
    }
    if (!payload.project) {
      throw new Error("Project ID is required (use -p or --project)");
    }

    const project = configService.getProjectById(payload.project);
    if (!project) {
      throw new Error(`Project '${payload.project}' does not exist in kanbatte.config.yaml`);
    }

    const sessionNumber = await sessionService.getNextSessionNumber({ projectId: payload.project });
    const sessionId = `${payload.project}-${sessionNumber}`;
    const now = Date.now();

    const sessionData = {
      messages: [{ role: "user", content: payload.message, timestamp: now }],
      project: payload.project,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    };

    const session = await sessionService.addSession({ sessionId, sessionData });
    console.log("Session created successfully! Session ID:", session.sessionId);
  };

  const getSession = async (payload) => {
    const { sessionId } = payload;
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    const session = await sessionService.getViewBySessionId({ sessionId });
    if (!session) {
      throw new Error(`Session '${sessionId}' does not exist`);
    }
    return session;
  };

  const updateSession = async (payload) => {
    const { sessionId } = payload;
    if (!sessionId) {
      throw new Error("Session ID is required (use -i or --session-id)");
    }
    const session = await sessionService.getViewBySessionId({ sessionId });
    if (!session) {
      throw new Error(`Session '${sessionId}' does not exist`);
    }

    const validUpdates = {};
    if (payload.status !== undefined) validUpdates.status = payload.status;
    if (payload.project !== undefined) validUpdates.project = payload.project;

    if (Object.keys(validUpdates).length === 0) {
      throw new Error("At least one update field is required (-s)");
    }

    const result = await sessionService.updateSession({ sessionId, validUpdates });
    console.log("Session status updated successfully!", { sessionId, status: result.status });
  };

  const readSession = async (sessionId, format = "markdown") => {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    const sessionData = await sessionService.getViewBySessionId({ sessionId });
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }
    formatOutput(sessionData, format, "read");
  };

  const listSessions = async (payload) => {
    if (!payload.project) {
      throw new Error("Project ID is required (use -p or --project)");
    }
    const statuses = payload.status ? payload.status.split(",").map((s) => s.trim()) : null;
    const sessions = await sessionService.getViewsByProjectId({
      projectId: payload.project,
      statuses,
    });

    if (sessions && sessions.length > 0) {
      formatOutput(sessions, payload.format || "table", "list");
    } else {
      console.log("No sessions found for this project.");
    }
  };

  const appendSessionMessages = async (payload) => {
    if (!payload.sessionId) {
      throw new Error("Session ID is required");
    }
    if (!payload.messages) {
      throw new Error("Messages are required (provide messages as JSON array)");
    }

    let messages;
    try {
      messages = JSON.parse(payload.messages);
    } catch (error) {
      throw new Error("Invalid JSON format for messages: " + error.message);
    }
    if (!Array.isArray(messages)) {
      throw new Error("Input must be a JSON array of messages");
    }

    await sessionService.appendSessionMessages({ sessionId: payload.sessionId, messages });
    console.log("Messages appended successfully to session:", payload.sessionId);
  };

  return {
    addSession,
    getSession,
    updateSession,
    readSession,
    listSessions,
    appendSessionMessages,
  };
};
