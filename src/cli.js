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

async function setupDB() {
  const { umzug } = createLibSqlUmzug({
    url: "file:local.db",
    glob: "db/migrations/*.sql",
  });

  await umzug.up();
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
);

const config = {
  url: "file:local.db",
};
const db = createClient(config);

const libsqlDaoDeps = {
  db,
  serialize,
  deserialize,
  generateId,
};

const commandsDeps = {
  libsqlDao: {
    addEventLog: (payload) => {
      return libsqlDao.addEventLog(libsqlDaoDeps, payload);
    },
    createTask: (taskData) => {
      return libsqlDao.createTask(libsqlDaoDeps, taskData);
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
    console.log("Creating new task:", options);
    commands.addTask(commandsDeps, options);
  });

// New comment command
newCmd
  .command("comment")
  .description("Create a new comment")
  .requiredOption("-i, --task-id <taskId>", "Task ID")
  .requiredOption("-c, --content <content>", "Comment content")
  .action((options) => {
    // TODO: Implement comment creation logic
    console.log("Creating new comment:", options);
  });

// New followup command
newCmd
  .command("followup")
  .description("Create a new followup")
  .requiredOption("-i, --task-id <taskId>", "Task ID")
  .requiredOption("-c, --content <content>", "Followup content")
  .action((options) => {
    // TODO: Implement followup creation logic
    console.log("Creating new followup:", options);
  });

// List command
program
  .command("list")
  .description("List tasks in a project")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .option("-s, --status <statuses>", "Filter by status (comma-separated)")
  .action((options) => {
    // TODO: Implement task listing logic
    console.log("Listing tasks:", options);
  });

// Read command
program
  .command("read")
  .description("Read and display a specific task")
  .argument("<taskId>", "Task ID")
  .action((taskId) => {
    // TODO: Implement task reading logic
    console.log("Reading task:", taskId);
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
    // TODO: Implement task update logic
    console.log("Updating task:", options);
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

// Parse command line arguments
program.parse(process.argv);
