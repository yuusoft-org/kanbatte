export const addSession = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;

  if (!payload.message) {
    console.error(
      "Error: Session message is required (use -m or --message)",
    );
    return;
  }

  if (!payload.project) {
    console.error("Error: Project ID is required (use -p or --project)");
    return;
  }

  const project = await libsqlDao.getProjectById(payload.project);
  if (!project) {
    console.error(`Error: Project '${payload.project}' does not exist`);
    return;
  }

  const sessionNumber = await libsqlDao.getNextSessionNumber(payload.project);
  const sessionId = `${payload.project}-${sessionNumber}`;
  const now = Date.now();

  const sessionData = {
    messages: [
      {
        role: "user",
        content: payload.message,
        timestamp: now
      }
    ],
    project: payload.project,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  const eventData = serialize({
    type: "session_created",
    sessionId: sessionId,
    data: sessionData,
    timestamp: Date.now(),
  });

  try {
    const appendPayload = { entityId: sessionId, eventData };
    await libsqlDao.appendEvent(appendPayload);
    await libsqlDao.computeAndSaveView({ id: sessionId });

    console.log("Session created successfully!" + ` Session ID: ${sessionId}`);
    return { sessionId, ...sessionData };
  } catch (error) {
    if (error.message.includes("no such table")) {
      console.error("Failed to create session:", error.message);
      console.info("Run 'kanbatte setup db' command to setup your database");
      return;
    }
    throw error;
  }
};


export const updateSession = async (deps, payload) => {
  const { serialize, libsqlDao, formatOutput } = deps;

  if (!payload.sessionId) {
    console.error("Error: Session ID is required (use -i or --session-id)");
    return;
  }

  const session = await libsqlDao.getViewBySessionId(payload.sessionId);
  if (!session) {
    console.error(`Error: Session '${payload.sessionId}' does not exist`);
    return;
  }

  const validUpdates = {};

  // Handle message updates
  if (payload.message !== undefined) {
    validUpdates.messages = [
      ...(session.messages || []),
      {
        role: "user",
        content: payload.message,
        timestamp: Date.now()
      }
    ];
  }

  // Handle other updates
  if (payload.status !== undefined) validUpdates.status = payload.status;
  if (payload.project !== undefined) validUpdates.project = payload.project;

  if (Object.keys(validUpdates).length === 0) {
    console.error(
      "Error: At least one update field is required (-s or --message)",
    );
    return;
  }

  const eventData = serialize({
    type: "session_updated",
    sessionId: payload.sessionId,
    data: validUpdates,
    timestamp: Date.now(),
  });

  try {
    const appendPayload = {
      entityId: payload.sessionId,
      eventData,
    };
    await libsqlDao.appendEvent(appendPayload);
    await libsqlDao.computeAndSaveView({ id: payload.sessionId });

    console.log("Session updated successfully!", {
      sessionId: payload.sessionId,
      ...validUpdates,
    });
    return { sessionId: payload.sessionId, ...validUpdates };
  } catch (error) {
    console.error("Failed to update session:", error.message);
    throw error;
  }
};


export const readSession = async (deps, sessionId, format = "table") => {
  const { libsqlDao, formatOutput } = deps;

  if (!sessionId) {
    console.error("Error: Session ID is required");
    return;
  }

  try {
    const sessionData = await libsqlDao.getViewBySessionId(sessionId);

    if (!sessionData) {
      console.error(`Error: Session ${sessionId} not found`);
      return;
    }

    formatOutput(sessionData, format, "read");
    return sessionData;
  } catch (error) {
    console.error("Failed to read session:", error.message);
    throw error;
  }
};

export const listSessions = async (deps, payload) => {
  const { libsqlDao, formatOutput } = deps;

  if (!payload.project) {
    console.error("Error: Project ID is required (use -p or --project)");
    return;
  }

  try {
    const statuses = payload.status
      ? payload.status.split(",").map((s) => s.trim())
      : null;

    const sessions = await libsqlDao.getViewsByProjectId({
      projectId: payload.project,
      statuses,
    });

    return sessions;
  } catch (error) {
    console.error("Failed to list sessions:", error.message);
    throw error;
  }
};

export const addProject = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;

  if (!payload.projectId) {
    console.error("Error: Project ID is required (use -p or --project-id)");
    return;
  }

  if (!payload.name) {
    console.error("Error: Project name is required (use -n or --name)");
    return;
  }

  const existing = await libsqlDao.getProjectById(payload.projectId);
  if (existing) {
    console.error(
      `Error: Project with ID '${payload.projectId}' already exists`,
    );
    return;
  }

  const projectData = {
    projectId: payload.projectId,
    name: payload.name,
    repository: payload.repository || "",
    description: payload.description || "",
  };

  const eventData = serialize({
    type: "project_created",
    projectId: payload.projectId,
    data: projectData,
    timestamp: Date.now(),
  });

  try {
    const appendPayload = { entityId: payload.projectId, eventData };
    await libsqlDao.appendEvent(appendPayload);
    await libsqlDao.computeAndSaveView({ id: payload.projectId });

    console.log("Project created successfully!", {
      projectId: payload.projectId,
    });
    return projectData;
  } catch (error) {
    console.error("Failed to create project:", error.message);
    throw error;
  }
};
