import { join } from "path";
import {
  formatPriority,
  createTaskFolders,
  getNextTaskId,
  generateTaskContent,
  scanTaskFiles,
  filterByStatus,
  filterByPriority,
  formatTaskTable,
  parseTaskId,
  calculateFolder,
  buildTaskPath,
  taskExists,
} from "../utils/tasks.js";

export const createTaskService = (deps) => {
  const { fs } = deps;

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
    const formattedPriority = formatPriority(priority);
    if (formattedPriority === null) {
      throw new Error("Invalid priority provided");
    }

    // Get next available task ID and folder
    const { taskId, folder } = getNextTaskId(deps, projectRoot, type);

    // Create folders if they don't exist
    const folderPath = createTaskFolders(deps, projectRoot, type, folder);

    // Generate file content
    const content = generateTaskContent(title, description, formattedPriority);

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
    let tasks = scanTaskFiles(deps, projectRoot, type);

    // Apply filters
    if (status) {
      tasks = filterByStatus(tasks, status);
    }

    if (priority) {
      tasks = filterByPriority(tasks, priority);
    }

    // Format and return output
    return formatTaskTable(tasks);
  };

  /**
   * Locates a task file and returns its relative path
   */
  const locateTask = (projectRoot, taskId) => {
    const { type, number } = parseTaskId(taskId);
    const folder = calculateFolder(number);
    const filePath = buildTaskPath(projectRoot, type, folder, taskId);

    if (!taskExists(deps, filePath)) {
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