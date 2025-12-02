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

  const userCmd = cmd.command("user").description("Discord user management");

  userCmd
    .command("add")
    .requiredOption("-u, --user-id <userId>", "Discord User ID")
    .requiredOption("-n, --name <name>", "Git name")
    .requiredOption("-e, --email <email>", "Git email")
    .description("Bind Discord user ID to Git user name and email")
    .action(async (options) => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const payload = {
        userId: options.userId,
        name: options.name,
        email: options.email,
      };
      await discordInsiemeDao.addUserEmailRecord(payload);
      console.log(`Bound Discord user ID ${options.userId} to Git user ${options.name} <${options.email}>`);
    });

  userCmd
    .command("list")
    .description("List Discord user bindings")
    .action(async () => {
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const records = await discordInsiemeDao.listUserEmailRecords();
      if (records.length === 0) {
        console.log("No Discord user bindings found.");
        return;
      }
      console.log("Discord User ID Bindings:");
      for (const record of records) {
        console.log(`- ${record.userId}: ${record.name} <${record.email}>`);
      }
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
