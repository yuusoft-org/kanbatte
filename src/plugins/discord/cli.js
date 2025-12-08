import { createDiscordInsieme } from "./infra/discordInsieme.js";
import { createDiscordService } from "./services/discordService.js";
import { createChannelCommands } from "./commands/channel.js";
import { createBotCommands } from "./commands/bot.js";
import { createUserCommands } from "./commands/user.js";
import { agentStart } from "../../commands/agent.js";

export const setupDiscordCli = (deps) => {
  const { cmd, discordLibsqlInfra, sessionService, libsqlInfra } = deps;

  const getDiscordServices = () => {
    discordLibsqlInfra.init();
    const discordInsieme = createDiscordInsieme({ discordLibsqlInfra });
    const discordService = createDiscordService({
      discordInsieme,
      discordLibsql: discordLibsqlInfra,
    });
    return { discordService, discordInsieme };
  };

  const { discordService, discordInsieme } = getDiscordServices();
  const botCommands = createBotCommands({
    discordService,
    sessionService,
    discordLibsqlInfra,
  });
  const userCommands = createUserCommands({ discordService });
  const channelCommands = createChannelCommands({ discordService });

  cmd
    .command("db")
    .argument("setup")
    .description("Set up Discord plugin database")
    .action(async () => {
      console.log("Setting up Discord plugin database...");
      discordLibsqlInfra.init();
      await discordLibsqlInfra.migrateDb();
      await discordInsieme.init();
      console.log("Discord plugin database setup completed!");
    });

  const botCmd = cmd.command("bot").description("Discord bot management");

  botCmd
    .command("start")
    .description("Start Discord bot")
    .action(async () => {
      libsqlInfra.init();
      botCommands.startBot();
      agentStart({ sessionService });
    });

  botCmd
    .command("allowed-roles")
    .argument("[roles]", "Comma-separated list of allowed Discord role IDs")
    .description("Set allowed Discord role IDs for bot commands")
    .action(async (roles) => {
      await botCommands.setAllowedRoles(roles);
    });

  const userCmd = cmd.command("user").description("Discord user management");

  userCmd
    .command("add")
    .requiredOption("-u, --user-id <userId>", "Discord User ID")
    .requiredOption("-n, --name <name>", "Git name")
    .requiredOption("-e, --email <email>", "Git email")
    .description("Bind Discord user ID to Git user name and email")
    .action(async (options) => {
      await userCommands.addUser(options);
    });

  userCmd
    .command("list")
    .description("List Discord user bindings")
    .action(async () => {
      await userCommands.listUsers();
    });

  const channelCmd = cmd.command("channel").description("Discord channel management");

  channelCmd
    .command("add")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel ID")
    .description("Add Discord channel for project")
    .action(async (options) => {
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
      await channelCommands.updateChannel({
        projectId: options.project,
        channelId: options.channel,
      });
    });
};
