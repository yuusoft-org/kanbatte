export const createDiscordServiceWithConfig = (deps) => {
  const { discordLibsql, configService } = deps;

  // Channel management - now uses configService
  const addChannel = async (payload) => {
    const { projectId, channelData, guildId } = payload;

    // Find the server to add the channel to
    if (!guildId) {
      throw new Error('Guild ID is required to add a channel');
    }

    const channel = {
      projectId: projectId,
      channelId: channelData.channel || channelData.channelId
    };

    return configService.addChannelToServer(guildId, channel);
  };

  const updateChannel = async (payload) => {
    const { projectId, validUpdates, guildId, channelId } = payload;

    if (!guildId) {
      throw new Error('Guild ID is required to update a channel');
    }

    const updates = {
      projectId: projectId || validUpdates.projectId,
      channelId: validUpdates.channel || validUpdates.channelId || channelId
    };

    return configService.updateChannelInServer(guildId, channelId, updates);
  };

  const listProjects = async () => {
    const projects = configService.getProjects();
    const projectsWithChannels = [];

    for (const project of projects) {
      const channels = configService.getChannelsByProjectId(project.id);
      if (channels.length > 0) {
        // Return format compatible with existing code
        projectsWithChannels.push({
          projectId: project.id,
          channel: channels[0].channelId, // For backwards compatibility, return first channel
          channels: channels // All channels for this project
        });
      }
    }

    return projectsWithChannels;
  };

  const getProjectIdByChannel = async (payload) => {
    const { channelId } = payload;
    return configService.getProjectIdByChannelId(channelId);
  };

  // Session-thread mappings still use database (these are runtime state)
  const addSessionThreadRecord = async (payload) => {
    return await discordLibsql.addSessionThreadRecord(payload);
  };

  const getSessionIdByThread = async (payload) => {
    return await discordLibsql.getSessionIdByThread(payload);
  };

  const getThreadIdBySession = async (payload) => {
    return await discordLibsql.getThreadIdBySession(payload);
  };

  // Allowed roles - now uses configService
  const setAllowedRoleIds = async (payload) => {
    const { roleIds, guildId } = payload;
    if (!guildId) {
      throw new Error('Guild ID is required to set allowed roles');
    }
    return configService.setAllowedRolesForServer(guildId, roleIds);
  };

  const getAllowedRoleIds = async (guildId) => {
    if (!guildId) {
      // For backwards compatibility, get roles from all servers
      const servers = configService.getDiscordServers();
      const allRoles = [];
      for (const server of servers) {
        if (server.allowedRoles) {
          allRoles.push(...server.allowedRoles);
        }
      }
      return [...new Set(allRoles)]; // Remove duplicates
    }
    return configService.getAllowedRolesByGuildId(guildId);
  };

  // User email records - now uses configService
  const addUserEmailRecord = async (payload) => {
    const { userId, name, email } = payload;
    const user = {
      userId: userId,
      name: name,
      email: email,
      gitAuthor: `${name} <${email}>`
    };
    return configService.addDiscordUser(user);
  };

  const getUserEmailRecord = async (payload) => {
    const { userId } = payload;
    const user = configService.getDiscordUserById(userId);
    if (!user) return null;

    // Parse gitAuthor if present to extract name and email
    if (user.gitAuthor) {
      const match = user.gitAuthor.match(/^([^<]+)\s*<([^>]+)>$/);
      if (match) {
        return {
          userId: user.userId,
          name: user.name || match[1].trim(),
          email: user.email || match[2].trim()
        };
      }
    }

    return {
      userId: user.userId,
      name: user.name || '',
      email: user.email || ''
    };
  };

  const listUserEmailRecords = async () => {
    const users = configService.getDiscordUsers();
    return users.map(user => {
      // Parse gitAuthor if present to extract name and email
      if (user.gitAuthor) {
        const match = user.gitAuthor.match(/^([^<]+)\s*<([^>]+)>$/);
        if (match) {
          return {
            userId: user.userId,
            name: user.name || match[1].trim(),
            email: user.email || match[2].trim()
          };
        }
      }

      return {
        userId: user.userId,
        name: user.name || '',
        email: user.email || ''
      };
    });
  };

  // Helper method to get all channel configurations
  const getAllChannelConfigs = () => {
    const servers = configService.getDiscordServers();
    const channelConfigs = [];

    for (const server of servers) {
      if (server.channels) {
        for (const channel of server.channels) {
          channelConfigs.push({
            ...channel,
            guildId: server.guildId,
            serverName: server.name,
            allowedRoles: server.allowedRoles || []
          });
        }
      }
    }

    return channelConfigs;
  };

  // Helper method to get channel config by channel ID
  const getChannelConfig = (channelId) => {
    const servers = configService.getDiscordServers();

    for (const server of servers) {
      if (server.channels) {
        const channel = server.channels.find(c => c.channelId === channelId);
        if (channel) {
          return {
            ...channel,
            guildId: server.guildId,
            serverName: server.name,
            allowedRoles: server.allowedRoles || []
          };
        }
      }
    }

    return null;
  };

  return {
    addChannel,
    updateChannel,
    listProjects,
    getProjectIdByChannel,
    addSessionThreadRecord,
    getSessionIdByThread,
    getThreadIdBySession,
    setAllowedRoleIds,
    getAllowedRoleIds,
    addUserEmailRecord,
    getUserEmailRecord,
    listUserEmailRecords,
    getAllChannelConfigs,
    getChannelConfig,
  };
};