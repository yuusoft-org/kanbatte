export const createChannelCommands = (deps) => {
  const { discordService } = deps;

  const addChannel = async (payload) => {
    const { projectId, channelId } = payload;

    await discordService.addChannel({
      projectId,
      channelData: { channel: channelId },
    });

    console.log(`Channel ${channelId} added for project ${projectId}`);
  };

  const updateChannel = async (payload) => {
    const { projectId, channelId } = payload;

    await discordService.updateChannel({
      projectId,
      validUpdates: { channel: channelId },
    });

    console.log(`Channel ${channelId} updated for project ${projectId}`);
  };

  return {
    addChannel,
    updateChannel,
  };
};
