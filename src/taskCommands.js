#!/usr/bin/env bun

import { writeFileSync, existsSync } from "fs";
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
} from "./utils/tasks.js";

/**
 * Creates a new task file with proper folder structure and ID generation
 */
export function createTask(projectRoot, options) {
  const { type, title, description, priority, assignee } = options;

  // Validate required fields
  if (!type) {
    console.error("Error: Task type is required");
    return null;
  }

  if (!title) {
    console.error("Error: Task title is required (use -t or --title)");
    return null;
  }

  // Validate and format priority
  const formattedPriority = formatPriority(priority);
  if (formattedPriority === null) {
    return null;
  }

  // Get next available task ID and folder
  const { taskId, folder } = getNextTaskId(projectRoot, type);

  // Create folders if they don't exist
  const folderPath = createTaskFolders(projectRoot, type, folder);

  // Generate file content
  const content = generateTaskContent(
    title,
    description,
    formattedPriority,
    assignee,
  );

  // Write file
  const filePath = join(folderPath, `${taskId}.md`);
  writeFileSync(filePath, content, "utf8");

  return { taskId, filePath };
}

/**
 * Lists tasks with optional filtering
 */
export function listTasks(projectRoot, options = {}) {
  const { type, status, priority } = options;

  // Scan for tasks
  let tasks = scanTaskFiles(projectRoot, type);

  // Apply filters
  if (status) {
    tasks = filterByStatus(tasks, status);
  }

  if (priority) {
    tasks = filterByPriority(tasks, priority);
  }

  // Format and return output
  return formatTaskTable(tasks);
}

/**
 * Locates a task file and returns its relative path
 */
export function locateTask(projectRoot, taskId) {
  const { type, number } = parseTaskId(taskId);
  const folder = calculateFolder(number);
  const filePath = buildTaskPath(projectRoot, type, folder, taskId);

  if (!taskExists(filePath)) {
    throw new Error(`Task file not found: ${taskId}`);
  }

  // Return relative path from current working directory to task file
  return `./tasks/${type}/${folder}/${taskId}.md`;
}
