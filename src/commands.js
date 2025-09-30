export const addTask = async (deps, options) => {
  const { db, generateId, serialize, libsqlDao } = deps;
  console.log("running commands.addTask", options);

  if (!options.title) {
    console.error(
      "Error: Task title is required (use -t or --title, or provide -f for file)",
    );
    return;
  }

  if (!options.project) {
    console.error("Error: Project ID is required (use -p or --project)");
    return;
  }

  const taskId = generateId();
  const taskData = {
    title: options.title,
    description: options.description || "",
    projectId: options.project,
    status: "todo",
  };

  const eventData = serialize({
    type: "task_created",
    taskId: taskId,
    data: taskData,
    timestamp: Date.now(),
  });

  try {
    await libsqlDao.appendEvent(db, taskId, eventData);

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

export const updateTask = async (deps, options) => {
  const { db, serialize, libsqlDao } = deps;

  if (!options.taskId) {
    console.error("Error: Task ID is required (use -i or --task-id)");
    return;
  }

  const updates = {};
  if (options.status) updates.status = options.status;
  if (options.title) updates.title = options.title;
  if (options.description) updates.description = options.description;

  if (Object.keys(updates).length === 0) {
    console.error(
      "Error: At least one update field is required (-s, -t, or --description)",
    );
    return;
  }

  const allowedUpdates = ["status", "title", "description"];
  const validUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key) && value !== undefined) {
      validUpdates[key] = value;
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    throw new Error("No valid updates provided");
  }

  const eventData = serialize({
    type: "task_updated",
    taskId: options.taskId,
    data: validUpdates,
    timestamp: Date.now(),
  });

  try {
    await libsqlDao.appendEvent(db, options.taskId, eventData);

    console.log("Task updated successfully!", {
      taskId: options.taskId,
      ...validUpdates,
    });
    return { taskId: options.taskId, ...validUpdates };
  } catch (error) {
    console.error("Failed to update task:", error.message);
    throw error;
  }
};
