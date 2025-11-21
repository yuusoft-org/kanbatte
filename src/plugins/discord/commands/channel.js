export const discordChannelAdd = async (deps, payload) => {
  const { discordInsiemeDao } = deps;

  await discordInsiemeDao.addChannel(payload);
  console.log(`Channel ${payload.channelId} added for project ${payload.channelData.project}`);
};

export const discordChannelUpdate = async (deps, payload) => {
  const { discordInsiemeDao } = deps;

  await discordInsiemeDao.updateChannel(payload);
  console.log(`Channel ${payload.channelId} updated for project ${payload.validUpdates.project}`);
};

export const discordStart = async (deps, payload) => {
  console.log("Starting Discord event listener...");
};