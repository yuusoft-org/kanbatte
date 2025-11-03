#!/usr/bin/env bun

import { Command } from "commander";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { serialize, deserialize } from "./utils/serialization.js";
import { generateId } from "./utils/helper.js";

import * as libsqlDao from "./dao/libsqlDao.js";
import * as commands from "./commands.js";
import { createLibSqlUmzug } from "umzug-libsql";
import { createClient } from "@libsql/client";
import { agent } from "./agent/agent.js";
import { formatOutput } from "./utils/output.js";
import { createTask, listTasks, locateTask } from "./taskCommands.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const dbPath = join(projectRoot, "local.db");
const migrationsPath = join(projectRoot, "db/migrations/*.sql");

async function setupDB() {
  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: migrationsPath,
  });

  await umzug.up();
}

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
);

const config = {
  url: `file:${dbPath}`,
};
const db = createClient(config);

const libsqlDaoDeps = {
  db,
  generateId,
  serialize,
  deserialize,
};

const commandsDeps = {
  serialize,
  deserialize,
  generateId,
  formatOutput,
  libsqlDao: {
    appendEvent: (payload) => {
      return libsqlDao.appendEvent(libsqlDaoDeps, payload);
    },
    computeAndSaveView: (payload) => {
      return libsqlDao.computeAndSaveView(libsqlDaoDeps, payload);
    },
    getViewByTaskId: (taskId) => {
      return libsqlDao.getViewByTaskId(libsqlDaoDeps, taskId);
    },
    getViewsByProjectId: (payload) => {
      return libsqlDao.getViewsByProjectId(libsqlDaoDeps, payload);
    },
    getNextTaskNumber: (projectId) => {
      return libsqlDao.getNextTaskNumber(libsqlDaoDeps, projectId);
    },
    getTasksByStatus: (status) => {
      return libsqlDao.getTasksByStatus(libsqlDaoDeps, status);
    },
    getProjectById: (projectId) => {
      return libsqlDao.getProjectById(libsqlDaoDeps, projectId);
    },
  },
};

const program = new Command();

program
  .name("kanbatte")
  .description("Orchestrate your AI agents with Kanban-like boards")
  .version(packageJson.version);

//Setup db

program
  .command("db")
  .description("Set up database for kanbatte")
  .action((options) => {
    console.log("Setting up database for kanbatte");
    setupDB();
  });

// agent command
program
  .command("agent")
  .description("Run agent on a ready task")
  .action(async () => {
    await agent(commandsDeps);
  });

// New command group
const newCmd = program.command("new");

// New task command
newCmd
  .command("task")
  .description("Create a new task")
  .option("-p, --project <projectId>", "Project ID")
  .option("-t, --title <title>", "Task title")
  .option("--description <description>", "Task description")
  .option("-f, --file <path>", "Create task from markdown file")
  .action((options) => {
    commands.addTask(commandsDeps, options);
  });

// New comment command
newCmd
  .command("comment")
  .description("Create a new comment")
  .requiredOption("-i, --task-id <taskId>", "Task ID")
  .requiredOption("-c, --content <content>", "Comment content")
  .action((options) => {
    commands.addComment(commandsDeps, options);
  });

// New followup command
newCmd
  .command("followup")
  .description("Create a new followup")
  .requiredOption("-i, --task-id <taskId>", "Task ID")
  .requiredOption("-c, --content <content>", "Followup content")
  .action((options) => {
    commands.addFollowup(commandsDeps, options);
  });

// New project command
newCmd
  .command("project")
  .description("Create a new project")
  .requiredOption("-p, --project-id <projectId>", "Project ID")
  .requiredOption("-n, --name <name>", "Project name")
  .option("-r, --repository <repository>", "Repository URL")
  .option("--description <description>", "Project description")
  .action((options) => {
    commands.addProject(commandsDeps, options);
  });

// List command
program
  .command("list")
  .description("List tasks in a project")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .option("-s, --status <statuses>", "Filter by status (comma-separated)")
  .option(
    "-f, --format <format>",
    "Output format: table, json, markdown",
    "table",
  )
  .action(async (options) => {
    const tasks = await commands.listTasks(commandsDeps, options);
    if (tasks) {
      commandsDeps.formatOutput(tasks, options.format, "list");
    }
  });

// Read command
program
  .command("read")
  .description("Read and display a specific task")
  .argument("<taskId>", "Task ID")
  .option(
    "-f, --format <format>",
    "Output format: table, json, markdown",
    "table",
  )
  .action((taskId, options) => {
    commands.readTask(commandsDeps, taskId, options.format);
  });

// Update command group
const updateCmd = program.command("update");

// Update task command
updateCmd
  .command("task")
  .description("Update task properties")
  .requiredOption("-i, --task-id <taskId>", "Task ID")
  .option("-s, --status <status>", "New status")
  .option("-t, --title <title>", "New title")
  .option("--description <description>", "New description")
  .action((options) => {
    commands.updateTask(commandsDeps, options);
  });

// Update followup command
updateCmd
  .command("followup")
  .description("Update followup status")
  .argument("<followupId>", "Followup ID")
  .requiredOption("-s, --status <status>", "New status")
  .action((followupId, options) => {
    // TODO: Implement followup update logic
    console.log("Updating followup:", followupId, options);
  });

// Task command group
const taskCmd = program.command("task");

// Task create command
taskCmd
  .command("create")
  .description("Create a new task file")
  .argument("<type>", "Task type (TASK, FEAT, BUG, etc.)")
  .requiredOption("-t, --title <title>", "Task title")
  .option("-d, --description <description>", "Task description")
  .option("-p, --priority <priority>", "Task priority (low, medium, high)")
  .action((type, options) => {
    const result = createTask(projectRoot, { type, ...options });
    if (result) {
      console.log("Task created successfully!");
      console.log(`Task ID: ${result.taskId}`);
      console.log(`File: ${result.filePath}`);
    }
  });

// Task list command
taskCmd
  .command("list")
  .description("List tasks in table format")
  .argument("[type]", "Task type to filter by (TASK, FEAT, BUG, etc.)")
  .option("-s, --status <status>", "Filter by status (todo, done)")
  .option("-p, --priority <priority>", "Filter by priority (low, medium, high, comma-separated)")
  .action((type, options) => {
    const result = listTasks(projectRoot, { type, ...options });
    console.log(result);
  });

// Task locate command
taskCmd
  .command("locate")
  .description("Locate a task file and return its relative path")
  .argument("<taskId>", "Task ID to locate (e.g., TASK-001, FEAT-002)")
  .action((taskId) => {
    try {
      const path = locateTask(projectRoot, taskId);
      console.log(path);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
