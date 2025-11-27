export const createTaskCommands = (deps) => {
  const { taskService } = deps;

  const createTask = (projectRoot, options) => {
    const result = taskService.createTask(projectRoot, options);
    if (result) {
      console.log("Task created successfully!");
      console.log(`Task ID: ${result.taskId}`);
      console.log(`File: ${result.filePath}`);
    }
  };

  const listTasks = (projectRoot, options) => {
    const result = taskService.listTasks(projectRoot, options);
    console.log(result);
  };

  const locateTask = (projectRoot, taskId) => {
    const path = taskService.locateTask(projectRoot, taskId);
    console.log(path);
  };

  return {
    createTask,
    listTasks,
    locateTask,
  };
};