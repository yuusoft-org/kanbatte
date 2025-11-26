const handleSessionEvent = async (deps) => {
  const { event, client, discordInsiemeDao } = deps;
  try {
    const { type, sessionId, data } = event;
    if (!sessionId) {
      console.warn('⚠️ Session event missing sessionId:', event);
      return;
    }

    const threadId = await discordInsiemeDao.getThreadIdBySession({ sessionId });

    if (!threadId) {
      console.warn(`⚠️ No thread found for session ${sessionId}`);
      return;
    }

    if (threadId) {
      const thread = await client.channels.fetch(threadId);
      if (thread) {
        switch (type) {
          case 'session_append_messages':
            for (const msg of data.messages) {
              let message;
              if (msg.role === 'user') {
                message = `🗨️ User: ${msg.content}`
              } else if (msg.role === 'assistant') {
                if (typeof msg.content === 'string') {
                  message = msg.content;
                } else if (Array.isArray(msg.content)) {
                  // Extract text from assistant messages with array content
                  message = msg.content
                    .filter(c => c.type === 'text')
                    .map(c => c.text)
                    .join('\n\n');
                }
              } else if (msg.role === 'system') {
                message = `⚙️ System: ${msg.content}`;
              } else {
                message = `ℹ️ ${msg.role}: ${msg.content}`;
              }
              console.log(`Sending message to thread ${threadId} for session ${sessionId}: ${message}`);
              await thread.send(message);
            }
            break;
          case 'session_updated':
            await thread.setName(`[${data.status}] ${sessionId}`);
            console.log(`Updating thread name to: ${thread.name}`);
            await thread.send(`🔄 Session ${sessionId} status updated to: ${data.status}`);
            break;
          default:
            // console.log(`Unhandled session event type: ${type} for session ${sessionId}:`, event);
            break;
        }
      }
    }
  } catch (error) {
    console.error('Error handling session event:', error);
  }
};

export const discordStartLoop = async (deps, payload) => {
  const { discordStore, mainInsiemeDao, discordInsiemeDao, client } = deps;
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
    if (client && discordInsiemeDao) {
      for (const event of recentEvents) {
        await handleSessionEvent({ event, client, discordInsiemeDao });
      }
    } else {
      recentEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. [${event.type}] Session: ${event.sessionId}`);
        console.log(`     Timestamp: ${new Date(event.timestamp).toISOString()}`);
        if (event.data) {
          console.log(`     Data:`, JSON.stringify(event.data, null, 2));
        }
      });
    }
  }

  return newOffsetId;
};

export const initializeOffset = async ({ discordStore }) => {
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

  const currentOffsetId = await initializeOffset({ discordStore });

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