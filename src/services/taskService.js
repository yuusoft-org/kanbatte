import { join, basename, extname } from "path";
import { load } from "js-yaml";
import {
  formatPriority,
  generateTaskContent,
  filterByStatus,
  filterByPriority,
  filterByAssignee,
  filterByLabels,
  formatTaskTable,
  parseTaskId,
  calculateFolder,
  buildTaskPath,
  formatLabels,
} from "../utils/tasks.js";
import {
  validateConfig,
  writeConfigJson,
  buildAggregateSpa,
} from "../utils/aggregate.js";

export const createTaskService = (deps) => {
  const { fs } = deps;

  const taskExists = (filePath) => {
    return fs.existsSync(filePath);
  };

  const createTaskFolders = (basePath, type, folderName) => {
    const taskTypePath = join(basePath, "tasks", type);
    const folderPath = join(taskTypePath, folderName);

    if (!fs.existsSync(taskTypePath)) {
      fs.mkdirSync(taskTypePath, { recursive: true });
    }

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    return folderPath;
  };

  const parseTaskFile = (filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const filename = basename(filePath, extname(filePath));
    const taskId = filename;

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error(`No frontmatter found in ${filePath}`);
    }

    const frontmatter = frontmatterMatch[1];
    const metadata = load(frontmatter);

    return {
      taskId,
      title: metadata.title,
      status: metadata.status,
      priority: metadata.priority,
      assignee: metadata.assignee || "",
      labels: metadata.labels || [],
    };
  };

  const scanTaskFiles = (basePath, typeFilter = null) => {
    const tasksPath = join(basePath, "tasks");
    const allTasks = [];

    if (!fs.existsSync(tasksPath)) {
      return allTasks;
    }

    let typeDirs = [];
    if (typeFilter) {
      const typePath = join(tasksPath, typeFilter);
      if (fs.existsSync(typePath)) {
        typeDirs = [typeFilter];
      }
    } else {
      typeDirs = fs
        .readdirSync(tasksPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
    }

    for (const type of typeDirs) {
      const typePath = join(tasksPath, type);
      const numericFolders = fs
        .readdirSync(typePath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && /^\d{3}$/.test(dirent.name))
        .map((dirent) => dirent.name)
        .sort((a, b) => parseInt(a) - parseInt(b));

      for (const folder of numericFolders) {
        const folderPath = join(typePath, folder);
        const files = fs
          .readdirSync(folderPath)
          .filter((file) => file.endsWith(".md"));

        for (const file of files) {
          const filePath = join(folderPath, file);
          try {
            const task = parseTaskFile(filePath);
            allTasks.push(task);
          } catch (error) {
            console.warn(
              `Warning: Skipping invalid task file ${filePath}: ${error.message}`,
            );
          }
        }
      }
    }

    return allTasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
  };

  const getNextTaskId = (basePath, type) => {
    const taskTypePath = join(basePath, "tasks", type);

    if (!fs.existsSync(taskTypePath)) {
      return { taskId: `${type}-001`, folder: "000" };
    }

    const folders = fs
      .readdirSync(taskTypePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort((a, b) => parseInt(a) - parseInt(b));

    for (const folder of folders) {
      const folderPath = join(taskTypePath, folder);
      const files = fs
        .readdirSync(folderPath)
        .filter((file) => file.endsWith(".md") && file.startsWith(type + "-"))
        .map((file) => {
          const match = file.match(new RegExp(`${type}-(\\d+)\\.md`));
          return match ? parseInt(match[1]) : 0;
        })
        .filter((num) => num > 0)
        .sort((a, b) => a - b);

      const folderNum = parseInt(folder);
      const startNum = folderNum === 0 ? 1 : folderNum;
      const endNum = folderNum + 99;

      for (let expectedNum = startNum; expectedNum <= endNum; expectedNum++) {
        if (!files.includes(expectedNum)) {
          return {
            taskId: `${type}-${expectedNum.toString().padStart(3, "0")}`,
            folder: folder,
          };
        }
      }
    }

    const lastFolderNum =
      folders.length > 0 ? parseInt(folders[folders.length - 1]) : 0;
    const newFolderNum = lastFolderNum === 0 ? 100 : lastFolderNum + 100;
    const newFolder = newFolderNum.toString().padStart(3, "0");
    const newTaskIdNum = newFolderNum === 100 ? 100 : newFolderNum;

    return {
      taskId: `${type}-${newTaskIdNum.toString().padStart(3, "0")}`,
      folder: newFolder,
    };
  };

  /**
   * Creates a new task file with proper folder structure and ID generation
   */
  const createTask = (projectRoot, options) => {
    const { type, title, description, priority, assignee, labels } = options;

    if (!type) {
      throw new Error("Task type is required");
    }
    if (!title) {
      throw new Error("Task title is required (use -t or --title)");
    }

    const formattedPriority = formatPriority(priority);
    const labelsList = formatLabels(labels);
    const { taskId, folder } = getNextTaskId(projectRoot, type);
    const folderPath = createTaskFolders(projectRoot, type, folder);
    const content = generateTaskContent(
      title,
      description,
      formattedPriority,
      assignee,
      labelsList,
    );
    const filePath = join(folderPath, `${taskId}.md`);
    fs.writeFileSync(filePath, content, "utf8");

    const result = { taskId, filePath };

    console.log("Task created successfully!");
    console.log(`Task ID: ${result.taskId}`);
    console.log(`File: ${result.filePath}`);

    return result;
  };

  /**
   * Lists tasks with optional filtering
   */
  const listTasks = (projectRoot, options = {}) => {
    const { type, status, priority, assignee, label } = options;

    let tasks = scanTaskFiles(projectRoot, type);

    if (status) {
      tasks = filterByStatus(tasks, status);
    }
    if (priority) {
      tasks = filterByPriority(tasks, priority);
    }
    if (assignee) {
      tasks = filterByAssignee(tasks, assignee);
    }
    if (label) {
      tasks = filterByLabels(tasks, label);
    }

    return formatTaskTable(tasks);
  };

  /**
   * Locates a task file and returns its relative path
   */
  const locateTask = (projectRoot, taskId) => {
    const { type, number } = parseTaskId(taskId);
    const folder = calculateFolder(number);
    const filePath = buildTaskPath(projectRoot, type, folder, taskId);

    if (!taskExists(filePath)) {
      throw new Error(`Task file not found: ${taskId}`);
    }

    return `./tasks/${type}/${folder}/${taskId}.md`;
  };

  /**
   * Aggregates tasks from remote sources
   */
  const aggregateTasks = async (projectRoot) => {
    const configPath = join(projectRoot, "kanbatte.config.yaml");

    if (!fs.existsSync(configPath)) {
      throw new Error("kanbatte.config.yaml not found in project root");
    }

    const configContent = fs.readFileSync(configPath, "utf8");
    let config;
    try {
      config = load(configContent);
    } catch (error) {
      throw new Error(`Failed to parse kanbatte.config.yaml: ${error.message}`);
    }

    validateConfig(config);

    const aggregateSpaDir = join(projectRoot, "_site", "aggregate");
    writeConfigJson(fs, aggregateSpaDir, config);

    await buildAggregateSpa(aggregateSpaDir);
  };

  return {
    createTask,
    listTasks,
    locateTask,
    aggregateTasks,
  };
};
