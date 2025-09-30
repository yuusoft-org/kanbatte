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

    console.log("Task created successfully!" + task);
    return task;
  } catch (error) {
    console.error("Failed to create task:", error.message);
    if (error.message.includes("no such table")) {
      console.info("Run kanbatte setup db command to setup your database");
    }
  }
};
