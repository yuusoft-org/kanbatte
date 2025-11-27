import { createMainInsiemeDao } from "../../deps/mainDao.js";
import { createDiscordInsiemeDao, setupDiscordDb } from "./deps/discordDao.js";
import { discordChannelAdd, discordChannelUpdate } from "./commands/channel.js";
import { startDiscordBot } from "./bot.js"
import { agentStart } from "../../commands/agent.js";

export const setupDiscordCli = (deps) => {
  const { cmd } = deps;
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

  cmd
    .command("bot")
    .argument("start")
    .description("Start Discord bot")
    .action(async () => {
      const insiemeDao = await createMainInsiemeDao();
      startDiscordBot();
      agentStart({ insiemeDao });
    });

  // Discord channel command group
  const channelCmd = cmd.command("channel").description("Discord channel management");

  channelCmd
    .command("add")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel IDs")
    .description("Add Discord channel for project")
    .action(async (options) => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const payload = { channelData: { channel: options.channel }, projectId: options.project };
      await discordChannelAdd({ discordInsiemeDao }, payload);
    });

  channelCmd
    .command("update")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel IDs")
    .description("Update Discord channel for project")
    .action(async (options) => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const payload = {
        validUpdates: { channel: options.channel }, projectId: options.project
      };
      await discordChannelUpdate({ discordInsiemeDao }, payload);
    });
};
