import { createMainInsiemeDao } from "../../deps/mainDao.js";
import { createDiscordInsiemeDao, setupDiscordDb, createDiscordStore } from "./deps/discordDao.js";
import { discordChannelAdd, discordChannelUpdate } from "./commands/channel.js";
import { startDiscordBot } from "./bot.js"
import { agentStart } from "../../commands/agent.js";
import { setAllowedRoleIds, getAllowedRoleIds } from "./commands/config.js";

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

  const botCmd = cmd.command("bot").description("Discord bot management");
  
  botCmd
    .command("start")
    .description("Start Discord bot")
    .action(async () => {
      const insiemeDao = await createMainInsiemeDao();
      startDiscordBot();
      agentStart({ insiemeDao });
    });

  botCmd
    .command("allowed-roles")
    .argument("[roles]", "Comma-separated list of allowed Discord role IDs")
    .description("Set allowed Discord role IDs for bot commands")
    .action(async (roles) => {
      const discordStore = await createDiscordStore();
      if (roles) {
        const roleIds = roles.split(",").map((roleId) => roleId.trim());
        await setAllowedRoleIds({ discordStore }, { roleIds });
        console.log(`Allowed roles set to: ${roleIds.join(", ")}`);
      } else {
        const roleIds = await getAllowedRoleIds({ discordStore });
        console.log(`Allowed roles: ${roleIds.join(", ")}`);
      }
    });

  botCmd
    .command("bind-user")
    .requiredOption("-u, --user-id <userId>", "Discord User ID")
    .requiredOption("-n, --user-name <userName>", "Git User name")
    .requiredOption("-e, --email <email>", "Git User email")
    .description("Bind Discord user ID to Git user name and email")
    .action(async (options) => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const payload = {
        userId: options.userId,
        userName: options.userName,
        email: options.email,
      };
      await discordInsiemeDao.addUserEmailRecord(payload);
      console.log(`Bound Discord user ID ${options.userId} to Git user ${options.userName} <${options.email}>`);
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
