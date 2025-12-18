#!/usr/bin/env bun

import { Command } from "commander";
import * as fs from "fs";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildSite } from "@rettangoli/sites/cli";
import { createTaskService } from "./services/taskService.js";
import { createTaskCommands } from "./commands/task.js";
import { createSessionCommands } from "./commands/session.js";
import { createConfigService } from "./services/configService.js";
import { createLibsqlInfra } from "./infra/libsql.js";
import { createInsieme } from "./infra/insieme.js";
import { createSessionService } from "./services/sessionService.js";
import { formatOutput } from "./utils/output.js";
import { agent } from "./commands/agent.js";
import { createGitService } from "./services/gitService.js";
import {
  removeDirectory,
  copyDirectory,
  copyDirectoryOverwrite,
  processAllTaskFiles,
  generateTasksData,
} from "./utils/buildSite.js";
import { setupDiscordCli } from "./plugins/discord/cli.js";

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

const configService = createConfigService();
configService.init(projectRoot);

const taskService = createTaskService({ fs });
const taskCommands = createTaskCommands({ taskService });

const dbPath = join(projectRoot, "local.db");

// Main App Infrastructure
const mainMigrationsPath = join(__dirname, "../db/migrations/*.sql");
const libsqlInfra = createLibsqlInfra({
  dbPath,
  migrationsPath: mainMigrationsPath,
  tableNames: {
    eventLog: "event_log",
    view: "view",
    kvStore: "kv_store",
    claudeSessionRecord: "claude_session_record",
  },
});
const insieme = createInsieme({
  libsqlInfra,
});
const sessionService = createSessionService({
  libsqlInfra,
  insieme,
  configService,
});
const gitService = createGitService();
const discordMigrationsPath = join(
  __dirname,
  "plugins/discord/db/migrations/*.sql",
);
const discordLibsqlInfra = createLibsqlInfra({
  dbPath,
  migrationsPath: discordMigrationsPath,
  tableNames: {
    eventLog: "discord_event_log",
    view: "discord_view",
    kvStore: "discord_kv_store",
    sessionThreadRecord: "discord_session_thread_record",
  },
});

const sessionCommands = createSessionCommands({
  sessionService,
  formatOutput,
  configService,
});

const dbCmd = program.command("db").description("Database operations");

dbCmd
  .command("setup")
  .description("Set up database for kanbatte")
  .action(async () => {
    console.log("Setting up database for kanbatte");
    libsqlInfra.init();
    await libsqlInfra.migrateDb();
    await insieme.init();
    console.log("Database setup completed!");
  });

const discordCmd = program.command("discord");
setupDiscordCli({
  cmd: discordCmd,
  libsqlInfra,
  discordLibsqlInfra,
  sessionService,
  configService,
  gitService,
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
  .option("-a, --assignee <assignee>", "Task assignee")
  .option("-l, --labels <label>", "Task label(s) (comma-separated)")
  .action((type, options) => {
    taskCommands.createTask(projectRoot, { type, ...options });
  });

// Task list command
taskCmd
  .command("list")
  .description("List tasks in table format")
  .argument("[type]", "Task type to filter by (TASK, FEAT, BUG, etc.)")
  .option("-s, --status <status>", "Filter by status (todo, done)")
  .option(
    "-p, --priority <priority>",
    "Filter by priority (low, medium, high, comma-separated)",
  )
  .option("-a, --assignee <assignee>", "Filter by assignee (comma-separated)")
  .option("-l, --label <label>", "Filter by label (comma-separated)")
  .action((type, options) => {
    taskCommands.listTasks(projectRoot, { type, ...options });
  });

// Task locate command
taskCmd
  .command("locate")
  .description("Locate a task file and return its relative path")
  .argument("<taskId>", "Task ID to locate (e.g., TASK-001, FEAT-002)")
  .action((taskId) => {
    taskCommands.locateTask(projectRoot, taskId);
  });

// Task aggregate command
taskCmd
  .command("aggregate")
  .description("Aggregate tasks from remote sources")
  .action(async () => {
    await taskCommands.aggregateTasks(projectRoot);
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
    generateTasksData(tasksDir, destDataDir, finalSiteDir);

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
    libsqlInfra.init();
    await sessionCommands.addSession({ ...options, message });
  });

// Session append command
sessionCmd
  .command("append")
  .description("Append messages to an existing session (JSON array format)")
  .argument("<sessionId>", "Session ID")
  .requiredOption("-m, --messages <messages>", "Messages in JSON array format")
  .option("-t, --stop", "Interrupt agent and set status to ready")
  .action(async (sessionId, options) => {
    libsqlInfra.init();
    await sessionCommands.appendSessionMessages({
      sessionId,
      messages: options.messages,
      stop: options.stop,
    });
  });

// Session status command
sessionCmd
  .command("status")
  .description("Get or update session status")
  .argument("<sessionId>", "Session ID")
  .argument("[status]", "New status (optional)")
  .action(async (sessionId, status) => {
    libsqlInfra.init();
    if (status) {
      await sessionCommands.updateSession({ sessionId, status });
    } else {
      const session = await sessionCommands.getSession({ sessionId });
      console.log(session.status);
    }
  });

// Session list command
sessionCmd
  .command("list")
  .description("List sessions in a project")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .option("-s, --status <status>", "Filter by status")
  .option(
    "-f, --format <format>",
    "Output format: table, json, markdown",
    "table",
  )
  .action(async (options) => {
    libsqlInfra.init();
    await sessionCommands.listSessions(options);
  });

// Session view command
sessionCmd
  .command("view")
  .description("View a specific session")
  .argument("<sessionId>", "Session ID")
  .option(
    "-f, --format <format>",
    "Output format: table, json, markdown",
    "markdown",
  )
  .action(async (sessionId, options) => {
    libsqlInfra.init();
    await sessionCommands.readSession(sessionId, options.format);
  });

const sessionProjectCmd = sessionCmd.command("project");

sessionProjectCmd
  .command("list")
  .description("List all projects from kanbatte.config.yaml")
  .action(async () => {
    await sessionCommands.listProjects();
  });

const agentCmd = program.command("agent").description("Control AI agents");

agentCmd
  .command("start")
  .description("Start agent to process ready sessions")
  .action(async () => {
    libsqlInfra.init();
    await agent({ sessionService });
  });

// Parse command line arguments
program.parse(process.argv);
