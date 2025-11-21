#!/usr/bin/env bun

import { Command } from "commander";
import { discordChannelAdd, discordChannelUpdate, discordStart } from "./commands/channel.js";
import { createDiscordInsiemeRepository } from "./deps/repository.js";
import { existsSync } from "fs";
import { join } from "path";
import { createLibSqlUmzug } from "umzug-libsql";
import { createInsiemeDao } from "../../deps/dao.js";
import * as insiemeDaoMethods from "./dao/insiemeDao.js";

// Get project root from main CLI
const projectRoot = process.env.PROJECT_ROOT || process.cwd();

const program = new Command();

export const setupDiscordDb = async (projectRoot) => {
  const dbPath = join(projectRoot, "local.db");
  console.log("Main database path:", dbPath);

  if (!existsSync(dbPath)) {
    throw new Error("Main database not found. Please run 'kanbatte db setup' first.");
  }

  // Run Discord-specific migrations using umzug-libsql
  const discordMigrationsPath = join(__dirname, "db/migrations/*.sql");
  console.log("Using migrationsPath:", discordMigrationsPath);
  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: discordMigrationsPath,
  });

  await umzug.up();
};

const createDiscordInsiemeDao = async () => {
  const repository = await createDiscordInsiemeRepository();
  return await createInsiemeDao({ projectRoot, repository, methods: insiemeDaoMethods });
}

program
  .name("kanbatte-discord")
  .description("Kanbatte Discord plugin")
  .version("1.0.0");

// Discord db setup command
program
  .command("db")
  .argument("setup")
  .description("Set up Discord plugin database")
  .action(async () => {
    console.log("Setting up Discord plugin database...");
    await setupDiscordDb(projectRoot);
    console.log("Discord plugin database setup completed!");
  });

// Discord channel command group
const channelCmd = program.command("channel").description("Discord channel management");

channelCmd
  .command("add")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .requiredOption("-c, --channel <channelId>", "Discord channel ID")
  .description("Add Discord channel for project")
  .action(async (options) => {
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const payload = { channelData: { project: options.project }, channelId: options.channel };
    await discordChannelAdd({ discordInsiemeDao }, payload);
  });

channelCmd
  .command("update")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .requiredOption("-c, --channel <channelId>", "Discord channel ID")
  .description("Update Discord channel for project")
  .action(async (options) => {
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const payload = {
      validUpdates: { project: options.project }, channelId: options.channel
    };
    await discordChannelUpdate({ discordInsiemeDao }, payload);
  });

// Discord start command
program
  .command("start")
  .description("Start Discord event listener")
  .action(async () => {
    const discordInsiemeDao = await createDiscordInsiemeDao();
  });

program.parse(process.argv);