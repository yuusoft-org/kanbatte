import { startDiscordBot } from "../bot.js";

export const createBotCommands = (deps) => {
  const { discordService, sessionService, discordLibsqlInfra, configService } = deps;

  const startBot = () => {
    startDiscordBot({
      sessionService,
      discordService,
      configService,
      discordLibsql: discordLibsqlInfra,
      gitService,
    });
  };

  return {
    startBot,
  };
};
