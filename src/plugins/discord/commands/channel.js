export const discordChannelAdd = async (deps, payload) => {
  const { discordDb } = deps;

  await discordDb.addDiscordChannel(payload);
  console.log(`Channel ${payload.channelId} added for project ${payload.projectId}`);
};

export const discordChannelUpdate = async (deps, payload) => {
  const { discordDb } = deps;

  await discordDb.updateDiscordChannel(payload);
  console.log(`Channel ${payload.channelId} updated for project ${payload.projectId}`);
};

export const discordStart = async (deps, payload) => {
  console.log("Starting Discord event listener...");
};