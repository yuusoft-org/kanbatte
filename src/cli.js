#!/usr/bin/env bun

import { Command } from "commander";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { serialize, deserialize } from "./utils/serialization.js";
import { generateId } from "./utils/helper.js";

import * as libsqlDao from "./dao/libsqlDao.js";
import { createLibSqlUmzug } from "umzug-libsql";
import { createClient } from "@libsql/client";
import { createTask, listTasks, locateTask } from "./taskCommands.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use current working directory for task operations (not CLI file location)
const projectRoot = process.cwd();
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
