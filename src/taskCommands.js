#!/usr/bin/env bun

import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, basename, extname } from "path";
import * as YAML from "js-yaml";

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

/**
 * Parses a task file and extracts metadata from YAML frontmatter
 */
function parseTaskFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    const filename = basename(filePath, extname(filePath));

    // Extract task ID from filename
    const taskId = filename;

    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.error(`Warning: No frontmatter found in ${filePath}`);
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const metadata = YAML.load(frontmatter);

    return {
      taskId,
      title: metadata.title || "Untitled",
      status: metadata.status || "todo",
      priority: metadata.priority || "low"
    };
  } catch (error) {
    console.error(`Error parsing task file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Scans task directories and returns all tasks
 */
function scanTaskFiles(basePath, typeFilter = null) {
  const tasksPath = join(basePath, "tasks");
  const allTasks = [];

  // If tasks directory doesn't exist, return empty array
  if (!existsSync(tasksPath)) {
    return allTasks;
  }

  // Get task type directories to scan
  let typeDirs = [];
  if (typeFilter) {
    // Scan only specified type
    const typePath = join(tasksPath, typeFilter);
    if (existsSync(typePath)) {
      typeDirs = [typeFilter];
    }
  } else {
    // Scan all task types
    typeDirs = readdirSync(tasksPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  // Scan each type directory
  for (const type of typeDirs) {
    const typePath = join(tasksPath, type);

    // Get numeric folders (000, 100, 200, etc.)
    const numericFolders = readdirSync(typePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && /^\d{3}$/.test(dirent.name))
      .map(dirent => dirent.name)
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Scan each numeric folder for task files
    for (const folder of numericFolders) {
      const folderPath = join(typePath, folder);
      const files = readdirSync(folderPath)
        .filter(file => file.endsWith(".md"));

      for (const file of files) {
        const filePath = join(folderPath, file);
        const task = parseTaskFile(filePath);
        if (task) {
          allTasks.push(task);
        }
      }
    }
  }

  // Sort tasks by ID for consistent ordering
  return allTasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
}

/**
 * Filters tasks by status
 */
function filterByStatus(tasks, status) {
  if (!status) return tasks;
  return tasks.filter(task => task.status === status);
}

/**
 * Filters tasks by priority (supports comma-separated values)
 */
function filterByPriority(tasks, priorities) {
  if (!priorities) return tasks;
  const priorityList = priorities.split(",").map(p => p.trim().toLowerCase());
  return tasks.filter(task => priorityList.includes(task.priority));
}

/**
 * Formats tasks as a table for CLI output
 */
function formatTaskTable(tasks) {
  if (tasks.length === 0) {
    return "No tasks found.";
  }

  // Calculate column widths
  const maxTaskIdWidth = Math.max("Task ID".length, ...tasks.map(t => t.taskId.length));
  const maxStatusWidth = Math.max("Status".length, ...tasks.map(t => t.status.length));
  const maxPriorityWidth = Math.max("Priority".length, ...tasks.map(t => t.priority.length));
  const maxTitleWidth = Math.max("Title".length, ...tasks.map(t => t.title.length));

  // Truncate title if too long (max 50 chars)
  const truncatedTasks = tasks.map(task => ({
    ...task,
    title: task.title.length > 50 ? task.title.substring(0, 47) + "..." : task.title
  }));
  const actualMaxTitleWidth = Math.min(50, maxTitleWidth);

  // Build table header
  const header = [
    "Task ID".padEnd(maxTaskIdWidth),
    "Status".padEnd(maxStatusWidth),
    "Priority".padEnd(maxPriorityWidth),
    "Title".padEnd(actualMaxTitleWidth)
  ].join(" | ");

  // Build separator
  const separator = "-".repeat(header.length);

  // Build table rows
  const rows = truncatedTasks.map(task => [
    task.taskId.padEnd(maxTaskIdWidth),
    task.status.padEnd(maxStatusWidth),
    task.priority.padEnd(maxPriorityWidth),
    task.title.padEnd(actualMaxTitleWidth)
  ].join(" | "));

  return [header, separator, ...rows].join("\n");
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