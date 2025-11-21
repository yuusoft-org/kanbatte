export const discordChannelAdd = async (deps, payload) => {
  const { discordInsiemeDao } = deps;

  await discordInsiemeDao.addChannel(payload);
  console.log(`Channels ${payload.channelData.channels} added for project ${payload.projectId}`);
};

export const discordChannelUpdate = async (deps, payload) => {
  const { discordInsiemeDao } = deps;

  await discordInsiemeDao.updateChannel(payload);
  console.log(`Channels ${payload.validUpdates.channels} updated for project ${payload.projectId}`);
};

export const discordStart = async (deps, payload) => {
  console.log("Starting Discord event listener...");
};