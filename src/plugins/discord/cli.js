import { discordChannelAdd, discordChannelUpdate } from "./commands/channel.js";
import { createInsiemeAdapter, createInsiemeRepository } from "../../deps/repository.js";
import { existsSync } from "fs";
import { join } from "path";
import { createLibSqlUmzug } from "umzug-libsql";
import { createInsiemeDao } from "../../deps/dao.js";
import * as insiemeDaoMethods from "./dao/insiemeDao.js";

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

      console.log("🚀 Starting Discord event listener...");

      // Get initial lastOffsetId
      let currentOffsetId = await discordStore.get("lastOffsetId");
      if (currentOffsetId === null) {
        currentOffsetId = 0;
        console.log("📊 Starting from beginning (no previous offset found)");
      } else {
        console.log(`📊 Starting from offset: ${currentOffsetId}`);
      }

      const checkForUpdates = async () => {
        const recentEvents = await mainInsiemeDao.fetchRecentSessionEvents({
          lastOffsetId: currentOffsetId
        });

        if (recentEvents.length > 0) {
          console.log(`🆕 ${recentEvents.length} new session events detected!`);

          const newOffsetId = currentOffsetId + recentEvents.length;

          await discordStore.set("lastOffsetId", newOffsetId);

          // Print new events
          recentEvents.forEach((event, index) => {
            console.log(`  ${index + 1}. [${event.eventData.type}] Session: ${event.eventData.sessionId}`);
            console.log(`     Timestamp: ${new Date(event.eventData.timestamp).toISOString()}`);
            if (event.eventData.data) {
              console.log(`     Data:`, JSON.stringify(event.eventData.data, null, 2));
            }
          });

          // Update current offset
          currentOffsetId = newOffsetId;
        }
      };

      // Check immediately
      await checkForUpdates();

      // Set up interval to check every 10 seconds
      const interval = setInterval(checkForUpdates, 10000);

      console.log("✅ Discord event listener is running. Checking for updates every 10 seconds...");
      console.log("Press Ctrl+C to stop");

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log("\n🛑 Stopping Discord event listener...");
        clearInterval(interval);
        process.exit(0);
      });
    });
};