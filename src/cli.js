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
import { addSession, updateSession, readSession, listSessions, addProject, updateProject, listProjects } from "./sessionCommands.js";
import { formatOutput } from "./utils/output.js";

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

// Session command group
const sessionCmd = program.command("session");

// Session queue command
sessionCmd
  .command("queue")
  .description("Create a new session and queue it for agent processing")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .requiredOption("-m, --message <message>", "Initial message content")
  .action((options) => {
    const sessionDeps = {
      serialize,
      deserialize,
      generateId,
      libsqlDao: {
        appendEvent: (payload) => {
          return libsqlDao.appendEvent(libsqlDaoDeps, payload);
        },
        computeAndSaveView: (payload) => {
          return libsqlDao.computeAndSaveView(libsqlDaoDeps, payload);
        },
        getViewBySessionId: (sessionId) => {
          return libsqlDao.getViewBySessionId(libsqlDaoDeps, sessionId);
        },
        getViewsByProjectId: (payload) => {
          return libsqlDao.getViewsByProjectId(libsqlDaoDeps, payload);
        },
        getNextSessionNumber: (projectId) => {
          return libsqlDao.getNextSessionNumber(libsqlDaoDeps, projectId);
        },
        getSessionsByStatus: (status) => {
          return libsqlDao.getSessionsByStatus(libsqlDaoDeps, status);
        },
        getProjectById: (projectId) => {
          return libsqlDao.getProjectById(libsqlDaoDeps, projectId);
        },
      },
    };
    addSession(sessionDeps, options);
  });

// Session append command
sessionCmd
  .command("append")
  .description("Append a message to an existing session")
  .argument("<sessionId>", "Session ID")
  .requiredOption("-m, --message <message>", "Message content")
  .action((sessionId, options) => {
    const sessionDeps = {
      serialize,
      deserialize,
      libsqlDao: {
        getViewBySessionId: (sessionId) => {
          return libsqlDao.getViewBySessionId(libsqlDaoDeps, sessionId);
        },
        appendEvent: (payload) => {
          return libsqlDao.appendEvent(libsqlDaoDeps, payload);
        },
        computeAndSaveView: (payload) => {
          return libsqlDao.computeAndSaveView(libsqlDaoDeps, payload);
        },
      },
    };
    updateSession(sessionDeps, { sessionId, ...options });
  });

// Session status command
sessionCmd
  .command("status")
  .description("Update session status")
  .argument("<sessionId>", "Session ID")
  .requiredOption("-s, --status <status>", "New status")
  .action((sessionId, options) => {
    const sessionDeps = {
      serialize,
      libsqlDao: {
        getViewBySessionId: (sessionId) => {
          return libsqlDao.getViewBySessionId(libsqlDaoDeps, sessionId);
        },
        appendEvent: (payload) => {
          return libsqlDao.appendEvent(libsqlDaoDeps, payload);
        },
        computeAndSaveView: (payload) => {
          return libsqlDao.computeAndSaveView(libsqlDaoDeps, payload);
        },
      },
    };
    updateSession(sessionDeps, { sessionId, ...options });
  });

// Session list command
sessionCmd
  .command("list")
  .description("List sessions in a project")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .option("-s, --status <status>", "Filter by status")
  .action((options) => {
    const sessionDeps = {
      libsqlDao: {
        getViewsByProjectId: (payload) => {
          return libsqlDao.getViewsByProjectId(libsqlDaoDeps, payload);
        },
      },
      formatOutput,
    };
    const sessions = listSessions(sessionDeps, options);
    if (sessions) {
      formatOutput(sessions, options.format || "table", "list");
    }
  });

// Session view command
sessionCmd
  .command("view")
  .description("View a specific session")
  .argument("<sessionId>", "Session ID")
  .option("-f, --format <format>", "Output format: table, json, markdown", "table")
  .action((sessionId, options) => {
    const sessionDeps = {
      libsqlDao: {
        getViewBySessionId: (sessionId) => {
          return libsqlDao.getViewBySessionId(libsqlDaoDeps, sessionId);
        },
      },
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
    const projectDeps = {
      serialize,
      libsqlDao: {
        getProjectById: (projectId) => {
          return libsqlDao.getProjectById(libsqlDaoDeps, projectId);
        },
        appendEvent: (payload) => {
          return libsqlDao.appendEvent(libsqlDaoDeps, payload);
        },
        computeAndSaveView: (payload) => {
          return libsqlDao.computeAndSaveView(libsqlDaoDeps, payload);
        },
      },
    };
    await addProject(projectDeps, {
      projectId: options.project,
      name: options.name,
      repository: options.repository,
      description: options.description
    });
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
    const projectDeps = {
      serialize,
      libsqlDao: {
        getProjectById: (projectId) => {
          return libsqlDao.getProjectById(libsqlDaoDeps, projectId);
        },
        appendEvent: (payload) => {
          return libsqlDao.appendEvent(libsqlDaoDeps, payload);
        },
        computeAndSaveView: (payload) => {
          return libsqlDao.computeAndSaveView(libsqlDaoDeps, payload);
        },
      },
    };
    const updateData = { projectId: options.project };
    if (options.name !== undefined) updateData.name = options.name;
    if (options.repository !== undefined) updateData.repository = options.repository;
    if (options.description !== undefined) updateData.description = options.description;
    await updateProject(projectDeps, updateData);
  });

// Session project list command
sessionProjectCmd
  .command("list")
  .description("List all projects")
  .action(async (options) => {
    const projectDeps = {
      formatOutput,
      libsqlDaoDeps,
      deserialize,
    };
    const projects = await listProjects(projectDeps);
    if (projects.length > 0) {
      console.log("Projects:");
      console.table(projects);
    }
  });

// Agent command
program
  .command("agent")
  .description("Run agent on ready sessions")
  .action(async () => {
    const { agent } = await import("./agent/agent.js");
    const agentDeps = {
      libsqlDao: {
        getSessionsByStatus: (status) => {
          return libsqlDao.getSessionsByStatus(libsqlDaoDeps, status);
        },
        getViewBySessionId: (sessionId) => {
          return libsqlDao.getViewBySessionId(libsqlDaoDeps, sessionId);
        },
        updateSession: (deps, payload) => {
          return updateSession(deps, payload);
        },
      },
    };
    await agent(agentDeps);
  });

// Parse command line arguments
program.parse(process.argv);
