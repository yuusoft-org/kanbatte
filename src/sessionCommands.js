export const addSession = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;

  if (!payload.message) {
    throw new Error("Session message is required (use -m or --message)");
  }

  if (!payload.project) {
    throw new Error("Project ID is required (use -p or --project)");
  }

  const project = await libsqlDao.getProjectById(payload.project);
  if (!project) {
    throw new Error(`Project '${payload.project}' does not exist`);
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

  const appendPayload = { entityId: sessionId, eventData };
  await libsqlDao.appendEvent(appendPayload);
  await libsqlDao.computeAndSaveView({ id: sessionId });

  console.log("Session created successfully!" + ` Session ID: ${sessionId}`);
  return { sessionId, ...sessionData };
};


export const updateSession = async (deps, payload) => {
  const { serialize, libsqlDao, formatOutput } = deps;

  if (!payload.sessionId) {
    throw new Error("Session ID is required (use -i or --session-id)");
  }

  const session = await libsqlDao.getViewBySessionId(payload.sessionId);
  if (!session) {
    throw new Error(`Session '${payload.sessionId}' does not exist`);
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

  const eventData = serialize({
    type: "session_updated",
    sessionId: payload.sessionId,
    data: validUpdates,
    timestamp: Date.now(),
  });

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
};


export const readSession = async (deps, sessionId, format = "table") => {
  const { libsqlDao, formatOutput } = deps;

  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const sessionData = await libsqlDao.getViewBySessionId(sessionId);

  if (!sessionData) {
    throw new Error(`Session ${sessionId} not found`);
  }

  formatOutput(sessionData, format, "read");
  return sessionData;
};

export const listSessions = async (deps, payload) => {
  const { libsqlDao, formatOutput } = deps;

  if (!payload.project) {
    throw new Error("Project ID is required (use -p or --project)");
  }

  const statuses = payload.status
    ? payload.status.split(",").map((s) => s.trim())
    : null;

  const sessions = await libsqlDao.getViewsByProjectId({
    projectId: payload.project,
    statuses,
  });

  return sessions;
};

export const addProject = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;

  if (!payload.projectId) {
    throw new Error("Project ID is required (use -p or --project-id)");
  }

  if (!payload.name) {
    throw new Error("Project name is required (use -n or --name)");
  }

  const existing = await libsqlDao.getProjectById(payload.projectId);
  if (existing) {
    throw new Error(`Project with ID '${payload.projectId}' already exists`);
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

  const appendPayload = { entityId: payload.projectId, eventData };
  await libsqlDao.appendEvent(appendPayload);
  await libsqlDao.computeAndSaveView({ id: payload.projectId });

  console.log("Project created successfully!", {
    projectId: payload.projectId,
  });
  return projectData;
};

export const updateProject = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;

  if (!payload.projectId) {
    throw new Error("Project ID is required (use -p or --project-id)");
  }

  const existing = await libsqlDao.getProjectById(payload.projectId);
  if (!existing) {
    throw new Error(`Project '${payload.projectId}' does not exist`);
  }

  const validUpdates = {};

  // Only update fields that are provided
  if (payload.name !== undefined) validUpdates.name = payload.name;
  if (payload.repository !== undefined) validUpdates.repository = payload.repository;
  if (payload.description !== undefined) validUpdates.description = payload.description;

  if (Object.keys(validUpdates).length === 0) {
    throw new Error("At least one update field is required (-n, -r, or --description)");
  }

  const eventData = serialize({
    type: "project_updated",
    projectId: payload.projectId,
    data: validUpdates,
    timestamp: Date.now(),
  });

  const appendPayload = { entityId: payload.projectId, eventData };
  await libsqlDao.appendEvent(appendPayload);
  await libsqlDao.computeAndSaveView({ id: payload.projectId });

  console.log("Project updated successfully!", {
    projectId: payload.projectId,
    ...validUpdates,
  });
  return { projectId: payload.projectId, ...validUpdates };
};

export const listProjects = async (deps) => {
  const { libsqlDaoDeps, deserialize } = deps;

  const result = await libsqlDaoDeps.db.execute({
    sql: "SELECT key, data FROM view WHERE key LIKE 'project:%' ORDER BY created_at ASC",
  });

  if (result.rows.length === 0) {
    console.log("No projects found.");
    return [];
  }

  const projects = result.rows.map(row => {
    const data = deserialize(row.data);
    return {
      'project-id': data.projectId,
      'name': data.name,
      'repository': data.repository,
      'description': data.description
    };
  });

  return projects;
};
