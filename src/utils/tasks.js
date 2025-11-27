import { join } from "path";

/**
 * Validates and formats priority value
 */
export const formatPriority = (priority) => {
  if (!priority) return "low";

  const validPriorities = ["low", "medium", "high"];
  const formatted = priority.toLowerCase();

  if (!validPriorities.includes(formatted)) {
    throw new Error(`Invalid priority '${priority}'. Must be one of: ${validPriorities.join(", ")}`);
  }

  return formatted;
};

/**
 * Generates markdown content for a task file
 */
export const generateTaskContent = (title, description, priority) => {
  const yamlFrontmatter = [
    "---",
    `title: ${title}`,
    "status: todo",
    `priority: ${priority}`,
    "---",
    "",
    "# Description",
    "",
    description || "",
    "",
  ];

  return yamlFrontmatter.join("\n");
};

/**
 * Filters tasks by status
 */
export const filterByStatus = (tasks, status) => {
  if (!status) return tasks;
  return tasks.filter((task) => task.status === status);
};

/**
 * Filters tasks by priority (supports comma-separated values)
 */
export const filterByPriority = (tasks, priorities) => {
  if (!priorities) return tasks;
  const priorityList = priorities.split(",").map((p) => p.trim().toLowerCase());
  return tasks.filter((task) => priorityList.includes(task.priority));
};

/**
 * Formats tasks as a table for CLI output
 */
export const formatTaskTable = (tasks) => {
  if (tasks.length === 0) {
    return "No tasks found.";
  }

  // Calculate column widths
  const maxTaskIdWidth = Math.max("Task ID".length, ...tasks.map((t) => t.taskId.length));
  const maxStatusWidth = Math.max("Status".length, ...tasks.map((t) => t.status.length));
  const maxPriorityWidth = Math.max("Priority".length, ...tasks.map((t) => t.priority.length));
  const maxTitleWidth = Math.max("Title".length, ...tasks.map((t) => t.title.length));

  // Truncate title if too long (max 50 chars)
  const truncatedTasks = tasks.map((task) => ({
    ...task,
    title: task.title.length > 50 ? task.title.substring(0, 47) + "..." : task.title,
  }));
  const actualMaxTitleWidth = Math.min(50, maxTitleWidth);

  // Build table header
  const header = [
    "Task ID".padEnd(maxTaskIdWidth),
    "Status".padEnd(maxStatusWidth),
    "Priority".padEnd(maxPriorityWidth),
    "Title".padEnd(actualMaxTitleWidth),
  ].join(" | ");

  // Build separator
  const separator = "-".repeat(header.length);

  // Build table rows
  const rows = truncatedTasks.map((task) =>
    [
      task.taskId.padEnd(maxTaskIdWidth),
      task.status.padEnd(maxStatusWidth),
      task.priority.padEnd(maxPriorityWidth),
      task.title.padEnd(actualMaxTitleWidth),
    ].join(" | "),
  );

  return [header, separator, ...rows].join("\n");
};

/**
 * Parses task ID to extract type and number
 */
export const parseTaskId = (taskId) => {
  const match = taskId.match(/^([A-Z]+)-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid task ID format: ${taskId}. Expected format: TYPE-123`);
  }

  return {
    type: match[1],
    number: parseInt(match[2]),
  };
};

/**
 * Calculates which folder a task should be in based on its number
 */
export const calculateFolder = (number) => {
  if (number < 1) {
    throw new Error(`Invalid task number: ${number}. Task numbers must start from 1`);
  }

  if (number <= 99) {
    return "000";
  } else {
    // For numbers 100+, find the appropriate 100-range
    const folderBase = Math.floor((number - 100) / 100) * 100 + 100;
    return folderBase.toString().padStart(3, "0");
  }
};

/**
 * Builds the absolute path to a task file
 */
export const buildTaskPath = (projectRoot, type, folder, taskId) => {
  return join(projectRoot, "tasks", type, folder, `${taskId}.md`);
};