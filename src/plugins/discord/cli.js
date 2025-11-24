import { discordChannelAdd, discordChannelUpdate } from "./commands/channel.js";
import { createInsiemeAdapter, createInsiemeRepository } from "../../deps/repository.js";
import { existsSync } from "fs";
import { join } from "path";
import { createLibSqlUmzug } from "umzug-libsql";
import { createInsiemeDao } from "../../deps/dao.js";
import * as insiemeDaoMethods from "./dao/insiemeDao.js";
import { startDiscordEventListener } from "./commands/start.js";

// Get project root from main CLI
const projectRoot = process.cwd();
const dbPath = join(projectRoot, "local.db");
const discordMigrationsPath = join(__dirname, "db/migrations/*.sql");

export const setupDiscordDb = async () => {
  if (!existsSync(dbPath)) {
    throw new Error("Main database not found. Please run 'kanbatte db setup' first.");
  }

  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: discordMigrationsPath,
  });

  await umzug.up();
};

const createDiscordStore = async () => {
  return await createInsiemeAdapter({
    dbPath,
    eventLogTableName: "discord_event_log",
    kvStoreTableName: "discord_kv_store",
  });
}

const createDiscordInsiemeDao = async () => {
  const store = await createDiscordStore();
  const repository = await createInsiemeRepository({ store });
  return await createInsiemeDao({ dbPath, repository, methods: insiemeDaoMethods });
}

export const setupDiscordCli = (deps) => {
  const { cmd, createMainInsiemeDao } = deps;
  // Discord db setup command
  cmd
    .command("db")
    .argument("setup")
    .description("Set up Discord plugin database")
    .action(async () => {
      console.log("Setting up Discord plugin database...");
      await setupDiscordDb();
      console.log("Discord plugin database setup completed!");
    });

  // Discord channel command group
  const channelCmd = cmd.command("channel").description("Discord channel management");

  channelCmd
    .command("add")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId...>", "Discord channel IDs")
    .description("Add Discord channel for project")
    .action(async (options) => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const payload = { channelData: { channels: options.channel }, projectId: options.project };
      await discordChannelAdd({ discordInsiemeDao }, payload);
    });

  channelCmd
    .command("update")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId...>", "Discord channel IDs")
    .description("Update Discord channel for project")
    .action(async (options) => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const payload = {
        validUpdates: { channels: options.channel }, projectId: options.project
      };
      await discordChannelUpdate({ discordInsiemeDao }, payload);
    });

  // Discord start command
  cmd
    .command("start")
    .description("Start Discord event listener")
    .action(async () => {
      const mainInsiemeDao = await createMainInsiemeDao();
      const discordStore = await createDiscordStore();

      await startDiscordEventListener({ mainInsiemeDao, discordStore });
    });
};