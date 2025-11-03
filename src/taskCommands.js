#!/usr/bin/env bun

import { readdirSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Validates and formats priority value
 */
function formatPriority(priority) {
  if (!priority) return "low";

  const validPriorities = ["low", "medium", "high"];
  const formatted = priority.toLowerCase();

  if (!validPriorities.includes(formatted)) {
    console.error(`Error: Invalid priority '${priority}'. Must be one of: ${validPriorities.join(", ")}`);
    return null;
  }

  return formatted;
}

/**
 * Creates the necessary folder structure for a task type
 */
function createTaskFolders(basePath, type, folderName) {
  const taskTypePath = join(basePath, "tasks", type);
  const folderPath = join(taskTypePath, folderName);

  if (!existsSync(taskTypePath)) {
    mkdirSync(taskTypePath, { recursive: true });
  }

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
}

/**
 * Scans existing task folders and returns the next available ID
 */
function getNextTaskId(basePath, type) {
  const taskTypePath = join(basePath, "tasks", type);

  // If the task type directory doesn't exist, start with TASK-001
  if (!existsSync(taskTypePath)) {
    return { taskId: `${type}-001`, folder: "000" };
  }

  // Get all folder directories (000, 100, 200, etc.)
  const folders = readdirSync(taskTypePath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort((a, b) => parseInt(a) - parseInt(b));

  // Check each folder for available IDs
  for (const folder of folders) {
    const folderPath = join(taskTypePath, folder);
    const files = readdirSync(folderPath)
      .filter(file => file.endsWith(".md") && file.startsWith(type + "-"))
      .map(file => {
        // Extract number from file name (e.g., TASK-001.md -> 1)
        const match = file.match(new RegExp(`${type}-(\\d+)\\.md`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => a - b);

    // Find the first available number in this folder
    const folderNum = parseInt(folder);
    const startNum = folderNum === 0 ? 1 : folderNum; // 000 folder starts from 1, others from folder number
    const endNum = folderNum + 99; // Each folder holds 100 tasks (000: 1-99, 100: 100-199, etc.)

    for (let expectedNum = startNum; expectedNum <= endNum; expectedNum++) {
      if (!files.includes(expectedNum)) {
        return {
          taskId: `${type}-${expectedNum.toString().padStart(3, "0")}`,
          folder: folder
        };
      }
    }
  }

  // If all existing folders are full, create a new one
  const lastFolderNum = folders.length > 0 ? parseInt(folders[folders.length - 1]) : 0;
  const newFolderNum = lastFolderNum + 100;
  const newFolder = newFolderNum.toString().padStart(3, "0");

  return {
    taskId: `${type}-${newFolderNum.toString().padStart(3, "0")}`,
    folder: newFolder
  };
}

/**
 * Generates markdown content for a task file
 */
function generateTaskContent(title, description, priority) {
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
    ""
  ];

  return yamlFrontmatter.join("\n");
}

/**
 * Creates a new task file with proper folder structure and ID generation
 */
export function createTask(projectRoot, options) {
  const { type, title, description, priority } = options;

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
  const content = generateTaskContent(title, description, formattedPriority);

  // Write file
  const filePath = join(folderPath, `${taskId}.md`);
  writeFileSync(filePath, content, "utf8");

  return { taskId, filePath };
}