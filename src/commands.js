export const addTask = async (deps, payload) => {
  const { db, generateId, serialize, libsqlDao } = deps;
  console.log("running commands.addTask", payload);

  if (!payload.title) {
    console.error(
      "Error: Task title is required (use -t or --title, or provide -f for file)",
    );
    return;
  }

  if (!payload.project) {
    console.error("Error: Project ID is required (use -p or --project)");
    return;
  }

  const taskId = generateId();
  const taskData = {
    title: payload.title,
    description: payload.description || "",
    projectId: payload.project,
    status: "todo",
  };

  const eventData = serialize({
    type: "task_created",
    taskId: taskId,
    data: taskData,
    timestamp: Date.now(),
  });

  try {
    const payload = { entityId: taskId, eventData };
    await libsqlDao.appendEvent(payload);

    console.log("Task created successfully!" + ` Task ID: ${taskId}`);
    return { taskId, ...taskData };
  } catch (error) {
    if (error.message.includes("no such table")) {
      console.error("Failed to create task:", error.message);
      console.info("Run 'kanbatte setup db' command to setup your database");
      return;
    }
    throw error;
  }
};

export const addComment = async (deps, payload) => {
  const { generateId, serialize, libsqlDao } = deps;

  if (!payload.taskId) {
    console.error("Error: Task ID is required (use -i or --task-id)");
    return;
  }

  if (!payload.content) {
    console.error("Error: Comment content is required (use -c or --content)");
    return;
  }

  const commentId = generateId();
  const commentData = {
    commentId,
    taskId: payload.taskId,
    content: payload.content,
  };

  const eventData = serialize({
    type: "comment_added",
    taskId: payload.taskId,
    data: commentData,
    timestamp: Date.now(),
  });

  try {
    const appendPayload = { entityId: payload.taskId, eventData };
    await libsqlDao.appendEvent(appendPayload);

    console.log("Comment created successfully!", { commentId });
    return commentData;
  } catch (error) {
    console.error("Failed to create comment:", error.message);
    throw error;
  }
};

export const updateTask = async (deps, payload) => {
  const { serialize, libsqlDao } = deps;

  if (!payload.taskId) {
    console.error("Error: Task ID is required (use -i or --task-id)");
    return;
  }

  const allowedUpdates = ["status", "title", "description"];
  const validUpdates = {};

  for (const [key, value] of Object.entries(payload)) {
    if (allowedUpdates.includes(key) && value !== undefined) {
      validUpdates[key] = value;
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    console.error(
      "Error: At least one update field is required (-s, -t, or --description)",
    );
    return;
  }

  const eventData = serialize({
    type: "task_updated",
    taskId: payload.taskId,
    data: validUpdates,
    timestamp: Date.now(),
  });

  try {
    const appendPayload = {
      entityId: payload.taskId,
      eventData,
    };
    await libsqlDao.appendEvent(appendPayload);

    console.log("Task updated successfully!", {
      taskId: payload.taskId,
      ...validUpdates,
    });
    return { taskId: payload.taskId, ...validUpdates };
  } catch (error) {
    console.error("Failed to update task:", error.message);
    throw error;
  }
};
