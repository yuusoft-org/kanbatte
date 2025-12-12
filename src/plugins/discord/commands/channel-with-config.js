export const createChannelCommandsWithConfig = (deps) => {
  const { configService } = deps;

  const addChannel = async (payload) => {
    const { projectId, channelId, guildId } = payload;

    // Ensure server exists
    const server = configService.getDiscordServerByGuildId(guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found. Please add the server first.`);
    }

    // Ensure project exists
    const project = configService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found. Please add the project first.`);
    }

    const channel = {
      projectId,
      channelId
    };

    configService.addChannelToServer(guildId, channel);
    console.log(`Channel ${channelId} added for project ${projectId} in server ${server.name}`);
  };

  const updateChannel = async (payload) => {
    const { channelId, guildId, projectId } = payload;

    // Ensure server exists
    const server = configService.getDiscordServerByGuildId(guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found.`);
    }

    const updates = {};
    if (projectId) {
      // Ensure project exists
      const project = configService.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project '${projectId}' not found.`);
      }
      updates.projectId = projectId;
    }

    configService.updateChannelInServer(guildId, channelId, updates);
    console.log(`Channel ${channelId} updated in server ${server.name}`);
  };

  const listChannels = async () => {
    const servers = configService.getDiscordServers();
    let hasChannels = false;

    console.log("Discord Channel Mappings:");
    for (const server of servers) {
      if (server.channels && server.channels.length > 0) {
        hasChannels = true;
        console.log(`\nServer: ${server.name} (${server.guildId})`);
        for (const channel of server.channels) {
          console.log(`  - Channel ${channel.channelId} -> Project ${channel.projectId}`);
        }
      }
    }

    if (!hasChannels) {
      console.log("No channel mappings found.");
    }
  };

  return {
    addChannel,
    updateChannel,
    listChannels,
  };
};