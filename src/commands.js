export const addTask = async (deps, options) => {
  const { libsqlDao } = deps;
  console.log("running commands.addTask", options);

  let taskData = {};

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

  taskData = {
    title: options.title,
    description: options.description || "",
    projectId: options.project,
  };

  try {
    const task = await libsqlDao.createTask({
      title: taskData.title,
      description: taskData.description,
      projectId: taskData.projectId,
      status: "todo",
    });

    console.log("Task created successfully!" + ` Task ID: ${task.taskId}`);
    return task;
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
  const { libsqlDao } = deps;

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

  try {
    const result = await libsqlDao.updateTask(options.taskId, updates);
    console.log("Task updated successfully!", result);
    return result;
  } catch (error) {
    console.error("Failed to update task:", error.message);
    throw error;
  }
};
