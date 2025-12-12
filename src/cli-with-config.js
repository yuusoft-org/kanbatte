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
import { createLibsqlInfra } from "./infra/libsql.js";
import { createInsieme } from "./infra/insieme.js";

// Import new config-based services
import { createConfigService } from "./services/configService.js";
import { createSessionServiceWithConfig } from "./services/sessionServiceWithConfig.js";
import { createConfigCommands } from "./commands/config.js";

import { formatOutput } from "./utils/output.js";
import { agent } from "./commands/agent.js";
import {
  removeDirectory,
  copyDirectory,
  copyDirectoryOverwrite,
  processAllTaskFiles,
  generateTasksData,
} from "./utils/buildSite.js";
import { createMainInsiemeDao } from "./deps/mainDao.js";
import { setupDiscordCliWithConfig } from "./plugins/discord/cli-with-config.js";

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

// Initialize config service
const configService = createConfigService();

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
  },
});
const insieme = createInsieme({
  libsqlInfra,
});

// Use config-based session service
const sessionService = createSessionServiceWithConfig({
  libsqlInfra,
  insieme,
  configService
});

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
    userEmailRecord: "discord_user_email_record",
  },
});

const sessionCommands = createSessionCommands({
  sessionService,
  formatOutput,
  discordLibsql: discordLibsqlInfra,
});

// Config command group
const configCmd = program.command("config").description("Configuration management");
const configCommands = createConfigCommands({
  configService,
  sessionService,
  // Note: discordService will be added from discord plugin
});

configCmd
  .command("init")
  .description("Initialize a new configuration file")
  .option("-f, --file <file>", "Path to configuration file")
  .option("--force", "Overwrite existing configuration")
  .action(async (options) => {
    await configCommands.initConfig(options);
  });

configCmd
  .command("validate")
  .description("Validate the configuration file")
  .option("-f, --file <file>", "Path to configuration file")
  .action(async (options) => {
    await configCommands.validateConfigFile(options);
  });

configCmd
  .command("show")
  .description("Show current configuration")
  .option("-f, --file <file>", "Path to configuration file")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await configCommands.showConfig(options);
  });

configCmd
  .command("reload")
  .description("Reload the configuration file")
  .action(async () => {
    await configCommands.reloadConfig();
  });

configCmd
  .command("path")
  .description("Show the path to the current configuration file")
  .action(async () => {
    await configCommands.getConfigPath();
  });

configCmd
  .command("migrate")
  .description("Migrate existing database configuration to config file")
  .option("--dry-run", "Show what would be migrated without making changes")
  .action(async (options) => {
    // This needs the old services for migration
    const { createSessionService } = await import("./services/sessionService.js");
    const { createDiscordService } = await import("./plugins/discord/services/discordService.js");
    const { createInsieme: createDiscordInsieme } = await import("./plugins/discord/infra/discordInsieme.js");

    const oldSessionService = createSessionService({ libsqlInfra, insieme });

    const discordInsieme = createDiscordInsieme({ discordLibsqlInfra });
    const oldDiscordService = createDiscordService({
      discordInsieme,
      discordLibsql: discordLibsqlInfra
    });

    const migrationCommands = createConfigCommands({
      configService,
      sessionService: oldSessionService,
      discordService: oldDiscordService
    });

    await migrationCommands.migrateFromDatabase(options);
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
setupDiscordCliWithConfig({
  cmd: discordCmd,
  libsqlInfra,
  discordLibsqlInfra,
  sessionService,
  configService,
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
  .action(async (sessionId, options) => {
    libsqlInfra.init();
    await sessionCommands.appendSessionMessages({
      sessionId,
      messages: options.messages,
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

// Session project command group - NOW USES CONFIG FILE
const sessionProjectCmd = sessionCmd.command("project");

// Session project create command
sessionProjectCmd
  .command("create")
  .description("Create a new project in the configuration file")
  .requiredOption("-p, --project <project>", "Project ID")
  .requiredOption("-n, --name <name>", "Project name")
  .requiredOption("-r, --repository <repository>", "Repository URL")
  .option("-d, --description <description>", "Project description")
  .action(async (options) => {
    try {
      await sessionCommands.addProject({
        projectId: options.project,
        name: options.name,
        repository: options.repository,
        description: options.description,
      });
      console.log(`✅ Project added to configuration file`);
    } catch (error) {
      console.error(`❌ Failed to create project: ${error.message}`);
      process.exit(1);
    }
  });

// Session project update command
sessionProjectCmd
  .command("update")
  .description("Update an existing project in the configuration file")
  .requiredOption("-p, --project <project>", "Project ID")
  .option("-n, --name <name>", "Project name")
  .option("-r, --repository <repository>", "Repository URL")
  .option("-d, --description <description>", "Project description")
  .action(async (options) => {
    try {
      await sessionCommands.updateProject({
        projectId: options.project,
        name: options.name,
        repository: options.repository,
        description: options.description,
      });
      console.log(`✅ Project updated in configuration file`);
    } catch (error) {
      console.error(`❌ Failed to update project: ${error.message}`);
      process.exit(1);
    }
  });

// Session project list command
sessionProjectCmd
  .command("list")
  .description("List all projects from the configuration file")
  .action(async () => {
    await sessionCommands.listProjects();
  });

// Agent command
program
  .command("agent <sessionId>")
  .description("Process a session using the AI agent")
  .option("-ll, --llm <llm>", "LLM to use", "claude")
  .option("-m, --model <model>", "Model to use")
  .option(
    "-f, --format <format>",
    "Input format for session data",
    "plaintext",
  )
  .action(async (sessionId, options) => {
    libsqlInfra.init();
    const session = await sessionCommands.getSession({ sessionId });

    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    await agent({
      sessionService,
      sessionId,
      llm: options.llm,
      model: options.model,
      format: options.format,
    });
  });

program.parse();