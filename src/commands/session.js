export const addSession = async (deps, payload) => {
  const { insiemeDao } = deps;

  if (!payload.message) {
    throw new Error("Session message is required (provide message as argument)");
  }

  if (!payload.project) {
    throw new Error("Project ID is required (use -p or --project)");
  }

  const project = await insiemeDao.getProjectById({ projectId: payload.project });
  if (!project) {
    throw new Error(`Project '${payload.project}' does not exist`);
  }

  const sessionNumber = await insiemeDao.getNextSessionNumber({ projectId: payload.project });
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

  await insiemeDao.addSession({ sessionId, sessionData });

  return { sessionId, ...sessionData };
};


export const getSession = async (deps, payload) => {
  const { insiemeDao } = deps;
  const { sessionId } = payload;

  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const session = await insiemeDao.getViewBySessionId({ sessionId });
  if (!session) {
    throw new Error(`Session '${sessionId}' does not exist`);
  }

  return session;
};

export const updateSession = async (deps, payload) => {
  const { insiemeDao } = deps;
  const { sessionId } = payload;

  if (!sessionId) {
    throw new Error("Session ID is required (use -i or --session-id)");
  }

  const session = await insiemeDao.getViewBySessionId({ sessionId });
  if (!session) {
    throw new Error(`Session '${sessionId}' does not exist`);
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
    throw new Error("At least one update field is required (-s or --message)");
  }

  await insiemeDao.updateSession({ sessionId, validUpdates });

  return { sessionId: sessionId, ...validUpdates };
};


export const readSession = async (deps, sessionId, format = "table") => {
  const { insiemeDao, formatOutput } = deps;

  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const sessionData = await insiemeDao.getViewBySessionId({ sessionId });

  if (!sessionData) {
    throw new Error(`Session ${sessionId} not found`);
  }

  formatOutput(sessionData, format, "read");
  return sessionData;
};

export const listSessions = async (deps, payload) => {
  const { insiemeDao } = deps;

  if (!payload.project) {
    throw new Error("Project ID is required (use -p or --project)");
  }

  const statuses = payload.status
    ? payload.status.split(",").map((s) => s.trim())
    : null;

  const sessions = await insiemeDao.getViewsByProjectId({
    projectId: payload.project,
    statuses,
  });

  return sessions;
};

export const addProject = async (deps, payload) => {
  const { insiemeDao } = deps;
  const { projectId } = payload;

  if (!projectId) {
    throw new Error("Project ID is required (use -p or --project-id)");
  }

  if (!payload.name) {
    throw new Error("Project name is required (use -n or --name)");
  }

  const existing = await insiemeDao.getProjectById({ projectId });
  if (existing) {
    throw new Error(`Project with ID '${projectId}' already exists`);
  }

  const projectData = {
    projectId: payload.projectId,
    name: payload.name,
    repository: payload.repository,
    description: payload.description,
  };

  await insiemeDao.addProject({ projectId, projectData });

  return projectData;
};

export const updateProject = async (deps, payload) => {
  const { insiemeDao } = deps;
  const { projectId } = payload;

  if (!projectId) {
    throw new Error("Project ID is required (use -p or --project-id)");
  }

  const existing = await insiemeDao.getProjectById({ projectId: projectId });
  if (!existing) {
    throw new Error(`Project '${projectId}' does not exist`);
  }

  const validUpdates = {};

  // Only update fields that are provided
  if (payload.name !== undefined) validUpdates.name = payload.name;
  if (payload.repository !== undefined) validUpdates.repository = payload.repository;
  if (payload.description !== undefined) validUpdates.description = payload.description;

  if (Object.keys(validUpdates).length === 0) {
    throw new Error("At least one update field is required (-n, -r, or --description)");
  }

  await insiemeDao.updateProject({ projectId, validUpdates });

  return { projectId, ...validUpdates };
};

export const listProjects = async (deps) => {
  const { insiemeDao, discordInsiemeDao } = deps;

  const basicResult = await insiemeDao.listProjects();

  let discordResult = [];
  if (discordInsiemeDao) {
    discordResult = await discordInsiemeDao.listProjects();
  }

  return basicResult.map(basicProject => {
    const discordProject = discordResult.find(dp => dp.projectId === basicProject.projectId);

    if (discordProject) {
      return {
        ...basicProject,
        ...discordProject,
      };
    }

    return basicProject;
  });
};

export const appendSessionMessages = async (deps, payload) => {
  const { insiemeDao } = deps;

  if (!payload.sessionId) {
    throw new Error("Session ID is required");
  }

  if (!payload.messages) {
    throw new Error("Messages are required (provide messages as JSON array)");
  }

  // Parse JSON input
  let messages;
  try {
    messages = JSON.parse(payload.messages);
  } catch (error) {
    throw new Error("Invalid JSON format: " + error.message);
  }

  // Validate that input is an array
  if (!Array.isArray(messages)) {
    throw new Error("Input must be a JSON array of messages");
  }

  // Validate array is not empty
  if (messages.length === 0) {
    throw new Error("Messages array cannot be empty");
  }

  // Validate each message in the array
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Check that message is an object
    if (typeof message !== 'object' || message === null) {
      throw new Error(`Message at index ${i} must be an object`);
    }

    // Check required fields
    if (!message.role) {
      throw new Error(`Message at index ${i} missing required field: role`);
    }

    if (!message.content) {
      throw new Error(`Message at index ${i} missing required field: content`);
    }

    // Validate role
    const validRoles = ['system', 'user', 'assistant'];
    if (!validRoles.includes(message.role)) {
      throw new Error(`Message at index ${i} has invalid role: ${message.role}. Valid roles: ${validRoles.join(', ')}`);
    }
  }

  // Check if session exists
  const session = await insiemeDao.getViewBySessionId({ sessionId: payload.sessionId });
  if (!session) {
    throw new Error(`Session '${payload.sessionId}' does not exist`);
  }

  await insiemeDao.appendSessionMessages({
    sessionId: payload.sessionId,
    messages
  });

  return { sessionId: payload.sessionId, messagesCount: messages.length };
};
