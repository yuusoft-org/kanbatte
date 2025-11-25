export const discordChannelAdd = async (deps, payload) => {
  const { discordInsiemeDao } = deps;

  await discordInsiemeDao.addChannel(payload);
  console.log(`Channel ${payload.channelData.channel} added for project ${payload.projectId}`);
};

export const discordChannelUpdate = async (deps, payload) => {
  const { discordInsiemeDao } = deps;

  await discordInsiemeDao.updateChannel(payload);
  console.log(`Channel ${payload.validUpdates.channel} updated for project ${payload.projectId}`);
};

export const discordStart = async (deps, payload) => {
  console.log("Starting Discord event listener...");
};