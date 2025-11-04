#!/usr/bin/env bun

import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, basename, extname } from "path";
import * as YAML from "js-yaml";

/**
 * Validates and formats priority value
 */
export function formatPriority(priority) {
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
export function createTaskFolders(basePath, type, folderName) {
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
export function getNextTaskId(basePath, type) {
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
export function generateTaskContent(title, description, priority) {
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
 * Parses a task file and extracts metadata from YAML frontmatter
 */
export function parseTaskFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const filename = basename(filePath, extname(filePath));

  // Extract task ID from filename
  const taskId = filename;

  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error(`No frontmatter found in ${filePath}`);
  }

  const frontmatter = frontmatterMatch[1];
  const metadata = YAML.load(frontmatter);

  return {
    taskId,
    title: metadata.title,
    status: metadata.status,
    priority: metadata.priority
  };
}

/**
 * Scans task directories and returns all tasks
 */
export function scanTaskFiles(basePath, typeFilter = null) {
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
        try {
          const task = parseTaskFile(filePath);
          allTasks.push(task);
        } catch (error) {
          // Skip files that can't be parsed, but continue processing other files
          console.error(`Warning: Skipping invalid task file ${filePath}: ${error.message}`);
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
export function filterByStatus(tasks, status) {
  if (!status) return tasks;
  return tasks.filter(task => task.status === status);
}

/**
 * Filters tasks by priority (supports comma-separated values)
 */
export function filterByPriority(tasks, priorities) {
  if (!priorities) return tasks;
  const priorityList = priorities.split(",").map(p => p.trim().toLowerCase());
  return tasks.filter(task => priorityList.includes(task.priority));
}

/**
 * Formats tasks as a table for CLI output
 */
export function formatTaskTable(tasks) {
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
 * Parses task ID to extract type and number
 */
export function parseTaskId(taskId) {
  const match = taskId.match(/^([A-Z]+)-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid task ID format: ${taskId}. Expected format: TYPE-123`);
  }

  return {
    type: match[1],
    number: parseInt(match[2])
  };
}

/**
 * Calculates which folder a task should be in based on its number
 */
export function calculateFolder(number) {
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
}

/**
 * Builds the absolute path to a task file
 */
export function buildTaskPath(projectRoot, type, folder, taskId) {
  return join(projectRoot, "tasks", type, folder, `${taskId}.md`);
}

/**
 * Checks if a task file exists
 */
export function taskExists(filePath) {
  return existsSync(filePath);
}

