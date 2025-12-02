import { createDiscordInsieme } from "./infra/discordInsieme.js";
import { createDiscordService } from "./services/discordService.js";
import { createChannelCommands } from "./commands/channel.js";
import { createStartCommands } from "./commands/start.js";
import { startDiscordBot } from "./bot.js";

export const setupDiscordCli = (deps) => {
  const { cmd, discordLibsqlInfra, sessionService } = deps;

  const getDiscordServices = () => {
    discordLibsqlInfra.init();
    const discordInsieme = createDiscordInsieme({ discordLibsqlInfra });
    const discordService = createDiscordService({
      discordInsieme,
      discordLibsql: discordLibsqlInfra,
    });
    return { discordService, discordInsieme };
  };

  cmd
    .command("db")
    .argument("setup")
    .description("Set up Discord plugin database")
    .action(async () => {
      console.log("Setting up Discord plugin database...");
      discordLibsqlInfra.init();
      await discordLibsqlInfra.migrateDb();
      const { discordInsieme } = getDiscordServices();
      await discordInsieme.init();
      console.log("Discord plugin database setup completed!");
    });

  const botCmd = cmd.command("bot").description("Discord bot management");
  
  botCmd
    .command("start")
    .description("Start Discord bot")
    .action(async () => {
      const { discordService } = getDiscordServices();
      
      startDiscordBot({
        sessionService,
        discordService,
        discordLibsql: discordLibsqlInfra,
      });
    });

  botCmd
    .command("allowed-roles")
    .argument("[roles]", "Comma-separated list of allowed Discord role IDs")
    .description("Set allowed Discord role IDs for bot commands")
    .action(async (roles) => {
      const { discordService } = getDiscordServices();
      if (roles) {
        const roleIds = roles.split(",").map((roleId) => roleId.trim());
        await discordService.setAllowedRoleIds({ roleIds });
        console.log(`Allowed roles set to: ${roleIds.join(", ")}`);
      } else {
        const roleIds = await discordService.getAllowedRoleIds();
        console.log(`Allowed roles: ${roleIds.join(", ")}`);
      }
    });

  const channelCmd = cmd.command("channel").description("Discord channel management");
  
  channelCmd
    .command("add")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel ID")
    .description("Add Discord channel for project")
    .action(async (options) => {
      const { discordService } = getDiscordServices();
      const channelCommands = createChannelCommands({ discordService });
      await channelCommands.addChannel({
        projectId: options.project,
        channelId: options.channel,
      });
    });

  channelCmd
    .command("update")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel ID")
    .description("Update Discord channel for project")
    .action(async (options) => {
      const { discordService } = getDiscordServices();
      const channelCommands = createChannelCommands({ discordService });
      await channelCommands.updateChannel({
        projectId: options.project,
        channelId: options.channel,
      });
    });
};
