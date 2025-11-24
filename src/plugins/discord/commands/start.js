const discordStartLoop = async (deps, payload) => {
  const { discordStore, mainInsiemeDao } = deps;
  const { currentOffsetId } = payload;

  const recentEvents = await mainInsiemeDao.fetchRecentSessionEvents({
    lastOffsetId: currentOffsetId
  });

  let newOffsetId = currentOffsetId;

  if (recentEvents.length > 0) {
    console.log(`🆕 ${recentEvents.length} new session events detected!`);

    // Get the actual id from the last event
    const lastEvent = recentEvents[recentEvents.length - 1];
    newOffsetId = lastEvent.id;

    await discordStore.set("lastOffsetId", newOffsetId);

    // Print new events
    recentEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. [${event.eventData.type}] Session: ${event.eventData.sessionId}`);
      console.log(`     Timestamp: ${new Date(event.eventData.timestamp).toISOString()}`);
      if (event.eventData.data) {
        console.log(`     Data:`, JSON.stringify(event.eventData.data, null, 2));
      }
    });
  }

  return newOffsetId;
};

const initializeOffset = async ({ discordStore }) => {
  let currentOffsetId = await discordStore.get("lastOffsetId");

  if (currentOffsetId === null) {
    currentOffsetId = 0;
    console.log("📊 Starting from beginning (no previous offset found)");
  } else {
    console.log(`📊 Starting from offset: ${currentOffsetId}`);
  }

  return currentOffsetId;
};

export const startDiscordEventListener = async ({ mainInsiemeDao, discordStore }) => {
  console.log("🚀 Starting Discord event listener...");

  const currentOffsetId = await initializeOffset({discordStore});

  // Check immediately
  let latestOffsetId = await discordStartLoop({ mainInsiemeDao, discordStore }, { currentOffsetId });

  // Set up interval to check every 10 seconds
  const interval = setInterval(async () => {
    latestOffsetId = await discordStartLoop({ mainInsiemeDao, discordStore }, { currentOffsetId: latestOffsetId });
  }, 10000);

  console.log("✅ Discord event listener is running. Checking for updates every 10 seconds...");
  console.log("Press Ctrl+C to stop");

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log("\n🛑 Stopping Discord event listener...");
    clearInterval(interval);
    process.exit(0);
  });

  return interval;
};