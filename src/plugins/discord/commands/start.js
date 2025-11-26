const splitTextForDiscord = (text, maxLength = 1500) => {
  if (text.length <= maxLength) {
    return [text];
  }

  let result = [];
  let currentText = text;

  while (currentText.length > maxLength) {
    const doubleNewlineIndex = currentText.lastIndexOf('\n\n', maxLength);
    if (doubleNewlineIndex > 0 && doubleNewlineIndex < maxLength) {
      result.push(currentText.substring(0, doubleNewlineIndex).trim());
      currentText = currentText.substring(doubleNewlineIndex + 2).trim();
      continue;
    }

    const punctuationMatch = currentText.substring(0, maxLength).match(/[.!?。！？]/);
    if (punctuationMatch) {
      const punctuationIndex = punctuationMatch.index;
      result.push(currentText.substring(0, punctuationIndex + 1).trim());
      currentText = currentText.substring(punctuationIndex + 1).trim();
      continue;
    }

    const spaceIndex = currentText.lastIndexOf(' ', maxLength);
    if (spaceIndex > 0) {
      result.push(currentText.substring(0, spaceIndex).trim());
      currentText = currentText.substring(spaceIndex + 1).trim();
      continue;
    }

    result.push(currentText.substring(0, maxLength));
    currentText = currentText.substring(maxLength);
  }

  if (currentText.trim()) {
    result.push(currentText.trim());
  }

  return result.filter(text => text.length > 0);
};

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

    const thread = await client.channels.fetch(threadId);
    if (!thread) {
      console.warn(`⚠️ Unable to fetch thread with ID ${threadId} for session ${sessionId}`);
      return;
    }

    switch (type) {
      case 'session_append_messages':
        for (const msg of data.messages) {
          if (msg.role === 'user') {
            if (typeof msg.content === 'string') {
              await thread.send(`🗨️ User: ${msg.content}`)
            } else if (Array.isArray(msg.content)) {
              //await thread.send(`🛠️ Using Tools...`)
            }
          } else if (msg.role === 'assistant') {
            if (typeof msg.content === 'string') {
              await thread.send(`🤖 Assistant: ${msg.content}`);
            } else if (Array.isArray(msg.content)) {
              for (const contentPart of msg.content) {
                if (contentPart.type === 'text') {
                  const textsList = splitTextForDiscord(contentPart.text);
                  for (const text of textsList) {
                    await thread.send(`🤖 Assistant: ${text}`);
                  }
                } else if (contentPart.type === 'tool_use') {
                  await thread.send(`🛠️ Assistant is calling tool: ${contentPart.name}`);
                }
              }
            }
          } else if (msg.role === 'system') {
            await thread.send(`⚙️ System: ${msg.content}`);
          } else {
            await thread.send(`ℹ️ ${msg.role}: ${msg.content}`);
          }
        }
        break;
      case 'session_updated':
        console.log(`Session ${sessionId} status updated to: ${data.status}`);
        await thread.setName(`[${data.status}] ${sessionId}`); // 暂时注释掉，避免卡住
        await thread.send(`🔄 Session ${sessionId} status updated to: ${data.status}`);
        console.log(`Session status message sent for ${sessionId}`);
        break;
      default:
        console.log(`Unhandled session event type: ${type} for session ${sessionId}:`, event);
        break;
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

    // Print new events first
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

    // Update offset only after successfully processing all events
    const lastEvent = recentEvents[recentEvents.length - 1];
    newOffsetId = lastEvent.id;
    await discordStore.set("lastOffsetId", newOffsetId);
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