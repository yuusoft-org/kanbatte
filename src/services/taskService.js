import { join } from "path";

export const createTaskService = (deps) => {
  const { fs, taskUtils } = deps;

  /**
   * Creates a new task file with proper folder structure and ID generation
   */
  const createTask = (projectRoot, options) => {
    const { type, title, description, priority } = options;

    // Validate required fields
    if (!type) {
      throw new Error("Task type is required");
    }

    if (!title) {
      throw new Error("Task title is required (use -t or --title)");
    }

    // Validate and format priority
    const formattedPriority = taskUtils.formatPriority(priority);
    if (formattedPriority === null) {
      throw new Error("Invalid priority provided");
    }

    // Get next available task ID and folder
    const { taskId, folder } = taskUtils.getNextTaskId(projectRoot, type);

    // Create folders if they don't exist
    const folderPath = taskUtils.createTaskFolders(projectRoot, type, folder);

    // Generate file content
    const content = taskUtils.generateTaskContent(title, description, formattedPriority);

    // Write file
    const filePath = join(folderPath, `${taskId}.md`);
    fs.writeFileSync(filePath, content, "utf8");

    return { taskId, filePath };
  };

  /**
   * Lists tasks with optional filtering
   */
  const listTasks = (projectRoot, options = {}) => {
    const { type, status, priority } = options;

    // Scan for tasks
    let tasks = taskUtils.scanTaskFiles(projectRoot, type);

    // Apply filters
    if (status) {
      tasks = taskUtils.filterByStatus(tasks, status);
    }

    if (priority) {
      tasks = taskUtils.filterByPriority(tasks, priority);
    }

    // Format and return output
    return taskUtils.formatTaskTable(tasks);
  };

  /**
   * Locates a task file and returns its relative path
   */
  const locateTask = (projectRoot, taskId) => {
    const { type, number } = taskUtils.parseTaskId(taskId);
    const folder = taskUtils.calculateFolder(number);
    const filePath = taskUtils.buildTaskPath(projectRoot, type, folder, taskId);

    if (!taskUtils.taskExists(filePath)) {
      throw new Error(`Task file not found: ${taskId}`);
    }

    // Return relative path from current working directory to task file
    return `./tasks/${type}/${folder}/${taskId}.md`;
  };

  return {
    createTask,
    listTasks,
    locateTask,
  };
};