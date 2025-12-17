import { createDiscordInsieme } from "./infra/discordInsieme.js";
import { createDiscordService } from "./services/discordService.js";
import { createBotCommands } from "./commands/bot.js";
import { agentStart } from "../../commands/agent.js";
import { deployDiscordCommands } from "./deploy.js";

export const setupDiscordCli = (deps) => {
  const { cmd, discordLibsqlInfra, sessionService, libsqlInfra, configService } = deps;

  const getDiscordServices = () => {
    discordLibsqlInfra.init();
    const discordInsieme = createDiscordInsieme({ discordLibsqlInfra });
    const discordService = createDiscordService({
      discordInsieme,
      discordLibsql: discordLibsqlInfra,
      configService,
    });
    return { discordService, discordInsieme };
  };

  const { discordService, discordInsieme } = getDiscordServices();
  const botCommands = createBotCommands({
    discordService,
    sessionService,
    discordLibsqlInfra,
    configService,
  });

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
      agentStart({ sessionService, configService });
    });

  cmd
    .command("deploy")
    .description("Deploy Discord slash commands to your server")
    .action(async () => {
      try {
        await deployDiscordCommands();
      } catch (error) {
        console.error("Failed to deploy Discord commands:", error.message);
        process.exit(1);
      }
    });
};
