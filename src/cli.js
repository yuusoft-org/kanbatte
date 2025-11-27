#!/usr/bin/env bun

import { Command } from "commander";
import * as fs from "fs";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildSite } from "@rettangoli/sites/cli";
import { formatOutput } from "./utils/output.js";
import { removeDirectory, copyDirectory, copyDirectoryOverwrite, processAllTaskFiles, generateTasksData } from "./utils/buildSite.js";
import { setupDiscordCli } from "./plugins/discord/cli.js";
import { createTaskService } from "./services/taskService.js";
import { createLibsqlService } from "./services/libsqlService.js";
import { createInsiemeService } from "./services/insiemeService.js";
import { createSessionService } from "./services/sessionService.js";
import { createAgentService } from "./services/agentService.js";
import { createDiscordLibsqlService } from "./plugins/discord/services/discordLibsqlService.js";
import { createDiscordInsiemeService } from "./plugins/discord/services/discordInsiemeService.js";
import { createDiscordService } from "./plugins/discord/services/discordService.js";
import { startDiscordBot } from "./plugins/discord/bot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
);

const program = new Command();

program
  .name("kanbatte")
  .description("Orchestrate your AI agents with Kanban-like boards")
  .version(packageJson.version);

const dbPath = join(projectRoot, "local.db");
const migrationsPath = join(__dirname, "../db/migrations/*.sql");
const discordMigrationsPath = join(__dirname, "./plugins/discord/db/migrations/*.sql");

const taskService = createTaskService({ fs });
const libsqlService = createLibsqlService({ dbPath, migrationsPath });
const insiemeService = await createInsiemeService({
  libsqlService,
  eventLogTableName: "event_log",
  kvStoreTableName: "kv_store",
});
const sessionService = createSessionService({ libsqlService, insiemeService });
const agentService = createAgentService({ sessionService });

const discordLibsqlService = createDiscordLibsqlService({ dbPath, migrationsPath: discordMigrationsPath });
const discordInsiemeService = await createDiscordInsiemeService({
  discordLibsqlService,
  eventLogTableName: "discord_event_log",
  kvStoreTableName: "discord_kv_store",
});
const discordService = createDiscordService({ discordLibsqlService, discordInsiemeService, sessionService });

//Setup db
const dbCmd = program.command("db").description("Database operations");

dbCmd
  .command("setup")
  .description("Set up database for kanbatte")
  .action(async () => {
    console.log("Setting up database for kanbatte");
    await libsqlService.init();
    await insiemeService.init();
    console.log("Database setup completed!");
  });

const discordCmd = program.command("discord");
setupDiscordCli({ cmd: discordCmd, discordService, discordLibsqlService, discordInsiemeService });

discordCmd
  .command("bot")
  .description("Start the Discord bot")
  .action(async () => {
    await startDiscordBot({ sessionService, discordService });
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
    const result = taskService.createTask(projectRoot, { type, ...options });
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
    const result = taskService.listTasks(projectRoot, { type, ...options });
    console.log(result);
  });

// Task locate command
taskCmd
  .command("locate")
  .description("Locate a task file and return its relative path")
  .argument("<taskId>", "Task ID to locate (e.g., TASK-001, FEAT-002)")
  .action((taskId) => {
    const path = taskService.locateTask(projectRoot, taskId);
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

    removeDirectory(tempDir);
    copyDirectory(templateDir, tempDir);
    generateTasksData(tasksDir, destDataDir);

    if (existsSync(tasksDir)) {
      processAllTaskFiles(tasksDir, destTasksDir);
    }

    await buildSite({ rootDir: tempDir });

    if (existsSync(join(tempDir, "_site"))) {
      copyDirectoryOverwrite(join(tempDir, "_site"), finalSiteDir);
    }

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
    const project = await sessionService.getProjectById({ projectId: options.project });
    if (!project) {
      throw new Error(`Project '${options.project}' does not exist`);
    }

    const sessionNumber = await sessionService.getNextSessionNumber({ projectId: options.project });
    const sessionId = `${options.project}-${sessionNumber}`;
    const now = Date.now();

    const sessionData = {
      messages: [{ role: "user", content: message, timestamp: now }],
      project: options.project,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    };

    await sessionService.addSession({ sessionId, sessionData });
    console.log("Session created successfully! Session ID:", sessionId);
  });

// Session append command
sessionCmd
  .command("append")
  .description("Append messages to an existing session (JSON array format)")
  .argument("<sessionId>", "Session ID")
  .requiredOption("-m, --messages <messages>", "Messages in JSON array format")
  .action(async (sessionId, options) => {
    let messages;
    try {
      messages = JSON.parse(options.messages);
    } catch (e) {
      throw new Error("Invalid JSON in messages argument");
    }
    await sessionService.appendSessionMessages({ sessionId, messages });
    console.log("Messages appended successfully to session:", sessionId);
  });

// Session status command
sessionCmd
  .command("status")
  .description("Get or update session status")
  .argument("<sessionId>", "Session ID")
  .argument("[status]", "New status (optional)")
  .action(async (sessionId, status) => {
    if (status) {
      await sessionService.updateSessionStatus({ sessionId, status });
      console.log("Session status updated successfully!", { sessionId, status });
    } else {
      const session = await sessionService.getViewBySessionId({ sessionId });
      if (!session) throw new Error(`Session '${sessionId}' not found.`);
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
    const statuses = options.status ? options.status.split(",").map((s) => s.trim()) : null;
    const sessions = await sessionService.getViewsByProjectId({ projectId: options.project, statuses });
    if (sessions && sessions.length > 0) {
      formatOutput(sessions, "table", "list");
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
    const sessionData = await sessionService.getViewBySessionId({ sessionId });
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }
    formatOutput(sessionData, options.format, "read");
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
    const projectData = {
      projectId: options.project,
      name: options.name,
      repository: options.repository,
      description: options.description,
    };
    await sessionService.addProject({ projectId: options.project, projectData });
    console.log("Project created successfully!", { projectId: projectData.projectId });
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
    const validUpdates = {};
    if (options.name !== undefined) validUpdates.name = options.name;
    if (options.repository !== undefined) validUpdates.repository = options.repository;
    if (options.description !== undefined) validUpdates.description = options.description;
    await sessionService.updateProject({ projectId: options.project, validUpdates });
    console.log("Project updated successfully!", { projectId: options.project });
  });

// Session project list command
sessionProjectCmd
  .command("list")
  .description("List all projects")
  .action(async () => {
    const mainProjects = await sessionService.listProjects();
    const discordProjects = await discordService.listProjects();

    const projects = mainProjects.map(p => {
      const discordData = discordProjects.find(dp => dp.projectId === p.projectId);
      return { ...p, ...discordData };
    });

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
    await agentService.start();
  });

// Parse command line arguments
program.parse(process.argv);
