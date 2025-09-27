#!/usr/bin/env bun

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import * as libsqlDao from './dao/libsqlDao.js';
import * as commands from './commands.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

import { createClient } from "@libsql/client";
const config = {
  url: "file:local.db"
};
const db = createClient(config);

const libsqlDaoDeps = {
  db
}

const commandsDeps = {
  libsqlDao: {
    addEventLog: (payload) => {
      return libsqlDao.addEventLog(libsqlDaoDeps, payload)
    },
    createTask: (taskData) => {
      return libsqlDao.createTask(libsqlDaoDeps, taskData)
    },
    getTaskById: (taskId) => {
      return libsqlDao.getTaskById(libsqlDaoDeps, taskId)
    },
    listTasks: (projectId, statusFilter) => {
      return libsqlDao.listTasks(libsqlDaoDeps, projectId, statusFilter)
    },
    updateTask: (taskId, updates) => {
      return libsqlDao.updateTask(libsqlDaoDeps, taskId, updates)
    },
    createComment: (commentData) => {
      return libsqlDao.createComment(libsqlDaoDeps, commentData)
    },
    getCommentsByTaskId: (taskId) => {
      return libsqlDao.getCommentsByTaskId(libsqlDaoDeps, taskId)
    }
  }
}


const program = new Command();

program
  .name('kanbatte')
  .description('Orchestrate your AI agents with Kanban-like boards')
  .version(packageJson.version);

// New command group
const newCmd = program.command('new');

// New task command
newCmd.command('task')
  .description('Create a new task')
  .option('-p, --project <projectId>', 'Project ID')
  .option('-t, --title <title>', 'Task title')
  .option('--description <description>', 'Task description')
  .option('-f, --file <path>', 'Create task from markdown file')
  .action((options) => {
    // TODO: Implement task creation logic
    console.log('Creating new task:', options);
    commands.addTask(commandsDeps, options)
  });

// New comment command
newCmd.command('comment')
  .description('Create a new comment')
  .requiredOption('-i, --task-id <taskId>', 'Task ID')
  .requiredOption('-c, --content <content>', 'Comment content')
  .action((options) => {
    commands.addComment(commandsDeps, options);
  });

// New followup command
newCmd.command('followup')
  .description('Create a new followup')
  .requiredOption('-i, --task-id <taskId>', 'Task ID')
  .requiredOption('-c, --content <content>', 'Followup content')
  .action((options) => {
    // TODO: Implement followup creation logic
    console.log('Creating new followup:', options);
  });

// List command
program.command('list')
  .description('List tasks in a project')
  .requiredOption('-p, --project <projectId>', 'Project ID')
  .option('-s, --status <statuses>', 'Filter by status (comma-separated)')
  .action((options) => {
    commands.listTasks(commandsDeps, options);
  });

// Read command
program.command('read')
  .description('Read and display a specific task')
  .argument('<taskId>', 'Task ID')
  .action((taskId) => {
    commands.readTask(commandsDeps, taskId);
  });

// Update command group
const updateCmd = program.command('update');

// Update task command
updateCmd.command('task')
  .description('Update task properties')
  .requiredOption('-i, --task-id <taskId>', 'Task ID')
  .option('-s, --status <status>', 'New status')
  .option('-t, --title <title>', 'New title')
  .option('--description <description>', 'New description')
  .action((options) => {
    commands.updateTask(commandsDeps, options);
  });

// Update followup command
updateCmd.command('followup')
  .description('Update followup status')
  .argument('<followupId>', 'Followup ID')
  .requiredOption('-s, --status <status>', 'New status')
  .action((followupId, options) => {
    // TODO: Implement followup update logic
    console.log('Updating followup:', followupId, options);
  });

// Parse command line arguments
program.parse(process.argv);
