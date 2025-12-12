import { startDiscordBot } from "../bot.js";

export const createBotCommandsWithConfig = (deps) => {
  const { discordService, sessionService, discordLibsqlInfra, configService } = deps;

  const startBot = () => {
    // The bot will use config service for users, channels, and roles
    startDiscordBot({
      sessionService,
      discordService,
      discordLibsql: discordLibsqlInfra,
      configService,
    });
  };

  const setAllowedRoles = async (roles, guildId) => {
    const server = configService.getDiscordServerByGuildId(guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found. Please add the server first.`);
    }

    const roleIds = roles.split(",").map((roleId) => roleId.trim());
    configService.setAllowedRolesForServer(guildId, roleIds);
    console.log(`Allowed roles for server '${server.name}' set to: ${roleIds.join(", ")}`);
  };

  const showAllowedRoles = async (guildId) => {
    const server = configService.getDiscordServerByGuildId(guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found.`);
    }

    const roleIds = configService.getAllowedRolesByGuildId(guildId);
    if (roleIds.length === 0) {
      console.log(`No allowed roles configured for server '${server.name}'`);
    } else {
      console.log(`Allowed roles for server '${server.name}': ${roleIds.join(", ")}`);
    }
  };

  return {
    startBot,
    setAllowedRoles,
    showAllowedRoles,
  };
};