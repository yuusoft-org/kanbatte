export const createDiscordService = (deps) => {
  const { discordLibsql, configService } = deps;

  const getProjectConfigByChannelId = (payload) => {
    const { channelId } = payload;
    return configService.getProjectConfigByChannelId(channelId);
  };

  const addSessionThreadRecord = async (payload) => {
    return await discordLibsql.addSessionThreadRecord(payload);
  };

  const getSessionIdByThread = async (payload) => {
    return await discordLibsql.getSessionIdByThread(payload);
  };

  const getThreadIdBySession = async (payload) => {
    return await discordLibsql.getThreadIdBySession(payload);
  };

  const getAllowedRolesByGuildId = (payload) => {
    const { guildId } = payload;
    return configService.getAllowedRolesByGuildId(guildId);
  };

  const getDiscordUserByUserId = (payload) => {
    const { userId } = payload;
    return configService.getDiscordUserByUserId(userId);
  };

  return {
    getProjectConfigByChannelId,
    addSessionThreadRecord,
    getSessionIdByThread,
    getThreadIdBySession,
    getAllowedRolesByGuildId,
    getDiscordUserByUserId,
  };
};
