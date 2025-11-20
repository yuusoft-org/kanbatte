#!/usr/bin/env bun

import { Command } from "commander";
import { discordChannelAdd, discordChannelUpdate, discordStart } from "./commands/channel.js";
import { setupDiscordDb, createDiscordDb } from "./discordDb.js";
import {  } from "./discordDb.js";

// Get project root from main CLI
const projectRoot = process.env.PROJECT_ROOT || process.cwd();

const program = new Command();

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
    const discordDb = createDiscordDb(projectRoot);
    const payload = { projectId: options.project, channelId: options.channel };
    await discordChannelAdd({ discordDb }, payload);
  });

channelCmd
  .command("update")
  .requiredOption("-p, --project <projectId>", "Project ID")
  .requiredOption("-c, --channel <channelId>", "Discord channel ID")
  .description("Update Discord channel for project")
  .action(async (options) => {
    const discordDb = createDiscordDb(projectRoot);
    const payload = { projectId: options.project, channelId: options.channel };
    await discordChannelUpdate({ discordDb }, payload);
  });

// Discord start command
program
  .command("start")
  .description("Start Discord event listener")
  .action(async () => {
    const discordDb = createDiscordDb(projectRoot);
    await discordStart({ discordDb }, {});
  });

program.parse(process.argv);