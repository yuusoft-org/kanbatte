import { splitTextForDiscord, classifyEventsBySession, transformSessionMessageAppend } from "../utils";

const handleSessionEvents = async (deps, payload) => {
  const { client, discordInsiemeDao } = deps;
  const { sessionId, events } = payload;

  try {
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
    const messageQueue = [];
    let shouldLockThread = false;

    for (const event of events) {
      const { type, data } = event;
      try {
        switch (type) {
          case 'session_append_messages':
            for (const msg of data.messages) {
              const formattedMessage = transformSessionMessageAppend(msg);
              if (formattedMessage) {
                messageQueue.push(formattedMessage);
              }
            }
            break;
          case 'session_updated':
            messageQueue.push(`🔄 Session ${sessionId} status updated to: ${data.status}`)
            console.log(`Session ${sessionId} status updated to: ${data.status}`)
            // If status is set to 'done', archive and lock the thread
            if (data.status === 'done') {
              shouldLockThread = true;
            }
            break;
          case 'session_created':
            console.log(`Session ${sessionId} created.`);
            break;
          default:
            console.log(`Unhandled session event type: ${type} for session ${sessionId}:`, event);
            break;
        }
      } catch (error) {
        console.error(`Error handling session ${sessionId} event:`, error);
        await thread.send(`⚠️ Error handling event of type '${type}': ${error.message}`);
        continue;
      }
    }
    // merge all messages and re-spilt for discord limits
    const mergedMessage = messageQueue.join('\n\n');
    const splitMessages = splitTextForDiscord(mergedMessage);
    for (const msg of splitMessages) {
      // Replace sequences of 3 or more consecutive newlines with exactly 2 newlines
      const normalizedMsg = msg.replace(/\n{3,}/g, '\n\n');
      if (normalizedMsg && normalizedMsg.trim().length > 0) {
        await thread.send(normalizedMsg);
      }
    }
    if (shouldLockThread) {
      await thread.setLocked(true);
      await thread.setArchived(true);
      console.log(`Thread ${sessionId} locked and archived`);
    }
  } catch (error) {
    console.error(`Error handling session ${sessionId} events:`, error);
    return;
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

    const eventsBySession = classifyEventsBySession(recentEvents);

    for (const [sessionId, events] of Object.entries(eventsBySession)) {
      await handleSessionEvents({ discordInsiemeDao, client }, { sessionId, events });
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