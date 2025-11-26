import { splitTextForDiscord } from "../utils";

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
        console.log(`Session ${sessionId} status updating to: ${data.status}`);
        await thread.setName(`[${data.status}] ${sessionId}`);
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

    for (const event of recentEvents) {
      await handleSessionEvent({ event, client, discordInsiemeDao });
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