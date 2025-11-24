#!/usr/bin/env bun

import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { serialize, deserialize } from "./utils/serialization.js";
import { generateId } from "./utils/helper.js";
import { buildSite } from "@rettangoli/sites/cli";
import * as insiemeDaoMethods from "./dao/insiemeDao.js";
import { createInsiemeAdapter, createInsiemeRepository } from './deps/repository.js'
import { createInsiemeDao } from "./deps/dao.js";
import { createLibSqlUmzug } from "umzug-libsql";
import { createTask, listTasks, locateTask } from "./commands/task.js";
import { addSession, updateSession, readSession, listSessions, addProject, updateProject, listProjects, getSession, appendSessionMessages } from "./commands/session.js";
import { formatOutput } from "./utils/output.js";
import { agent } from "./commands/agent.js";
import { removeDirectory, copyDirectory, copyDirectoryOverwrite, processAllTaskFiles, generateTasksData } from "./utils/buildSite.js";
import { setupDiscordCli } from "./plugins/discord/cli.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use current working directory for task operations (not CLI file location)
const projectRoot = process.cwd();
const dbPath = join(projectRoot, "local.db");
const migrationsPath = join(projectRoot, "db/migrations/*.sql");

const setupDB = async () => {
  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: migrationsPath,
  });

  await umzug.up();
}

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
);

const createMainStore = async () => {
  return await createInsiemeAdapter({ 
    dbPath, 
    eventLogTableName: "event_log",
    kvStoreTableName: "kv_store",
  });
}

const createMainInsiemeDao = async () => {
  const store = await createMainStore();
  const repository = await createInsiemeRepository({ store });
  return await createInsiemeDao({ dbPath, repository, methods: insiemeDaoMethods });
}

const program = new Command();

program
  .name("kanbatte")
  .description("Orchestrate your AI agents with Kanban-like boards")
  .version(packageJson.version);

//Setup db
const dbCmd = program.command("db").description("Database operations");

dbCmd
  .command("setup")
  .description("Set up database for kanbatte")
  .action(() => {
    console.log("Setting up database for kanbatte");
    setupDB();
  });

const discordCmd = program.command("discord");
setupDiscordCli({ cmd: discordCmd, createMainInsiemeDao });


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
    const path = locateTask(projectRoot, taskId);
    console.log(path);
  });

// Build Task site
taskCmd
  .command("build")
  .description("Build the Task site")
  .action(async () => {
    const tempDir = join(projectRoot, ".kanbatte");
    const templateDir = join(__dirname, "../site");
    const tasksDir = join(projectRoot, "tasks");
    const destTasksDir = join(tempDir, "pages", "tasks");
    const destDataDir = join(tempDir, "data");
    const finalSiteDir = join(projectRoot, "_site");

    // Remove temporary directory if it exists
    removeDirectory(tempDir);

    // Copy site template to temporary directory
    copyDirectory(templateDir, tempDir);

    // Generate tasks.yaml data file
    generateTasksData(tasksDir, destDataDir);

    // Process and copy task markdown files
    if (existsSync(tasksDir)) {
      processAllTaskFiles(tasksDir, destTasksDir);
    }

    // Build the site in temporary directory
    await buildSite({ rootDir: tempDir });

    // Copy built _site to project root (overwrite existing files)
    if (existsSync(join(tempDir, "_site"))) {
      copyDirectoryOverwrite(join(tempDir, "_site"), finalSiteDir);
    }

    // Clean up temporary directory
    removeDirectory(tempDir);

    console.log("Task site built successfully!");
  });

// Session command group
const sessionCmd = program.command("session");

// Session queue command
sessionCmd
  .command("queue")
  .description("Create a new session and queue it for agent processing")
  .argument("<message>", "Initial message content")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .action(async (message, options) => {
    const insiemeDao = await createMainInsiemeDao();

    const sessionDeps = {
      serialize,
      deserialize,
      generateId,
      insiemeDao
    };
    const session = await addSession(sessionDeps, { ...options, message });
    console.log("Session created successfully! Session ID:", session.sessionId);
  });

// Session append command
sessionCmd
  .command("append")
  .description("Append messages to an existing session (JSON array format)")
  .argument("<sessionId>", "Session ID")
  .requiredOption("-m, --messages <messages>", "Messages in JSON array format")
  .action(async (sessionId, options) => {
    const insiemeDao = await createMainInsiemeDao();

    const sessionDeps = {
      serialize,
      deserialize,
      insiemeDao
    };
    await appendSessionMessages(sessionDeps, { sessionId, messages: options.messages });
    console.log("Messages appended successfully to session:", sessionId);
  });

// Session status command
sessionCmd
  .command("status")
  .description("Get or update session status")
  .argument("<sessionId>", "Session ID")
  .argument("[status]", "New status (optional)")
  .action(async (sessionId, status) => {
    const insiemeDao = await createMainInsiemeDao();

    const sessionDeps = {
      serialize,
      formatOutput,
      insiemeDao
    };

    if (status) {
      // Update status
      const result = await updateSession(sessionDeps, { sessionId, status });
      console.log("Session status updated successfully!", { sessionId, status: result.status });
    } else {
      // Get current status
      const session = await getSession(sessionDeps, { sessionId });
      console.log(session.status);
    }
  });

// Session list command
sessionCmd
  .command("list")
  .description("List sessions in a project")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .option("-s, --status <status>", "Filter by status")
  .action(async (options) => {
    const insiemeDao = await createMainInsiemeDao();

    const sessionDeps = {
      insiemeDao,
      formatOutput,
    };
    const sessions = await listSessions(sessionDeps, options);
    if (sessions && sessions.length > 0) {
      formatOutput(sessions, options.format || "table", "list");
    } else {
      console.log("No sessions found for this project.");
    }
  });

// Session view command
sessionCmd
  .command("view")
  .description("View a specific session")
  .argument("<sessionId>", "Session ID")
  .option("-f, --format <format>", "Output format: table, json, markdown", "markdown")
  .action(async (sessionId, options) => {
    const insiemeDao = await createMainInsiemeDao();

    const sessionDeps = {
      insiemeDao,
      formatOutput,
    };
    readSession(sessionDeps, sessionId, options.format);
  });

// Session project command group
const sessionProjectCmd = sessionCmd.command("project");

// Session project create command
sessionProjectCmd
  .command("create")
  .description("Create a new project")
  .requiredOption("-p, --project <project>", "Project ID")
  .requiredOption("-n, --name <name>", "Project name")
  .requiredOption("-r, --repository <repository>", "Repository URL")
  .option("-d, --description <description>", "Project description")
  .action(async (options) => {
    const insiemeDao = await createMainInsiemeDao();

    const projectDeps = {
      serialize,
      insiemeDao
    };
    const project = await addProject(projectDeps, {
      projectId: options.project,
      name: options.name,
      repository: options.repository,
      description: options.description
    });
    console.log("Project created successfully!", { projectId: project.projectId });
  });

// Session project update command
sessionProjectCmd
  .command("update")
  .description("Update an existing project")
  .requiredOption("-p, --project <project>", "Project ID")
  .option("-n, --name <name>", "Project name")
  .option("-r, --repository <repository>", "Repository URL")
  .option("-d, --description <description>", "Project description")
  .action(async (options) => {
    const insiemeDao = await createMainInsiemeDao();

    const projectDeps = {
      serialize,
      insiemeDao
    };
    const updateData = { projectId: options.project };
    if (options.name !== undefined) updateData.name = options.name;
    if (options.repository !== undefined) updateData.repository = options.repository;
    if (options.description !== undefined) updateData.description = options.description;
    const result = await updateProject(projectDeps, updateData);
    console.log("Project updated successfully!", { projectId: result.projectId });
  });

// Session project list command
sessionProjectCmd
  .command("list")
  .description("List all projects")
  .action(async () => {
    const insiemeDao = await createMainInsiemeDao();
    const projects = await listProjects({ insiemeDao });
    if (projects.length > 0) {
      console.log("Projects:");
      console.table(projects);
    } else {
      console.log("No projects found.");
    }
  });

// Agent command group
const agentCmd = program.command("agent").description("Control AI agents");

agentCmd
  .command("start")
  .description("Start agent to process ready sessions")
  .action(async () => {
    const insiemeDao = await createMainInsiemeDao();
    await agent({ insiemeDao });
  });

// Parse command line arguments
program.parse(process.argv);
