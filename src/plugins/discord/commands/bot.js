import { startDiscordBot } from "../bot.js";

export const createBotCommands = (deps) => {
  const { discordService, sessionService, discordLibsqlInfra } = deps;

  const startBot = () => {
    startDiscordBot({
      sessionService,
      discordService,
      discordLibsql: discordLibsqlInfra,
    });
  };

  const setAllowedRoles = async (roles) => {
    if (roles) {
      const roleIds = roles.split(",").map((roleId) => roleId.trim());
      await discordService.setAllowedRoleIds({ roleIds });
      console.log(`Allowed roles set to: ${roleIds.join(", ")}`);
    } else {
      const roleIds = await discordService.getAllowedRoleIds();
      console.log(`Allowed roles: ${roleIds.join(", ")}`);
    }
  };

  return {
    startBot,
    setAllowedRoles,
  };
};
