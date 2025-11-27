import { generateId } from "../../../utils/helper.js";
import { serialize, deserialize } from "../../../utils/serialization.js";

export const createDiscordService = (deps) => {
  const { discordLibsqlService, discordInsiemeService, sessionService } = deps;
  const { repository, store: discordStore } = discordInsiemeService;

  const _fetchEventsByPartition = async (partition) => {
    return await repository.getEventsAsync({ partition: [partition] });
  };

  const _computeAndSaveView = async (id) => {
    const db = discordLibsqlService.getClient();
    const events = await _fetchEventsByPartition(id);
    if (events.length === 0) return null;

    let state;
    let viewKey;
    let firstEvent = deserialize(events[0].payload.value.eventData);

    if (firstEvent.type === "channel_created") {
      state = { projectId: id, channel: "" };
      viewKey = `project:${id}`;
    }

    for (const row of events) {
      const event = deserialize(row.payload.value.eventData);
      switch (event.type) {
        case "channel_created":
          state.channel = event.data.channel || state.channel;
          state.createdAt = event.data.createdAt || state.createdAt;
          state.updatedAt = event.timestamp;
          break;
        case "channel_updated":
          if (event.data.project !== undefined) state.channel = event.data.channel;
          state.updatedAt = event.timestamp;
          break;
        default:
          break;
      }
    }

    const viewData = serialize(state);
    const now = Date.now();
    const existing = await db.execute({
      sql: "SELECT id FROM discord_view WHERE key = ?",
      args: [viewKey],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE discord_view SET data = ?, updated_at = ? WHERE key = ?",
        args: [viewData, now, viewKey],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO discord_view (id, key, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        args: [generateId(), viewKey, viewData, now, now],
      });
    }
    return state;
  };

  const addChannel = async (payload) => {
    const { projectId, channelData } = payload;
    const eventData = serialize({
      type: "channel_created",
      projectId: projectId,
      data: channelData,
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(projectId);
  };

  const updateChannel = async (payload) => {
    const { projectId, validUpdates } = payload;
    const eventData = serialize({
      type: "channel_updated",
      projectId: projectId,
      data: validUpdates,
      timestamp: Date.now(),
    });
    await repository.addEvent({
      type: "treePush",
      partition: projectId,
      payload: { target: "events", value: { eventData }, options: { parent: "_root" } },
    });
    await _computeAndSaveView(projectId);
  };

  const addSessionThreadRecord = async (payload) => {
    const db = discordLibsqlService.getClient();
    const { sessionId, threadId } = payload;
    await db.execute({
      sql: "INSERT INTO discord_session_thread_record (session_id, thread_id) VALUES (?, ?)",
      args: [sessionId, threadId],
    });
  };

  const getSessionIdByThread = async (payload) => {
    const db = discordLibsqlService.getClient();
    const { threadId } = payload;
    const result = await db.execute({
      sql: "SELECT session_id FROM discord_session_thread_record WHERE thread_id = ?",
      args: [threadId],
    });
    if (result.rows.length === 0) return null;
    return result.rows[0].session_id;
  };

  const listProjects = async () => {
    const db = discordLibsqlService.getClient();
    const result = await db.execute({
      sql: "SELECT key, data FROM discord_view WHERE key LIKE 'project:%' ORDER BY created_at ASC",
    });
    if (result.rows.length === 0) return [];
    return result.rows.map((row) => {
      const data = deserialize(row.data);
      return { projectId: data.projectId, channel: data.channel };
    });
  };

  const getProjectIdByChannel = async (payload) => {
    const db = discordLibsqlService.getClient();
    const { channelId } = payload;
    const result = await db.execute({
      sql: "SELECT key, data FROM discord_view WHERE key LIKE 'project:%'",
    });
    for (const row of result.rows) {
      const data = deserialize(row.data);
      if (data.channel === channelId) {
        return data.projectId;
      }
    }
    return null;
  };

  const startEventListener = async () => {
    console.log("🚀 Starting Discord event listener...");

    let currentOffsetId = await discordStore.get("lastOffsetId");
    if (currentOffsetId === null) {
      currentOffsetId = 0;
      console.log("📊 Starting from beginning (no previous offset found)");
    } else {
      console.log(`📊 Starting from offset: ${currentOffsetId}`);
    }

    const runLoop = async (offset) => {
      const recentEvents = await sessionService.fetchRecentSessionEvents({ lastOffsetId: offset });
      let newOffsetId = offset;

      if (recentEvents.length > 0) {
        console.log(`🆕 ${recentEvents.length} new session events detected!`);
        newOffsetId = recentEvents[recentEvents.length - 1].id;
        await discordStore.set("lastOffsetId", newOffsetId);

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

    let latestOffsetId = await runLoop(currentOffsetId);

    const interval = setInterval(async () => {
      latestOffsetId = await runLoop(latestOffsetId);
    }, 10000);

    console.log("✅ Discord event listener is running. Checking for updates every 10 seconds...");
    console.log("Press Ctrl+C to stop");

    process.on("SIGINT", () => {
      console.log("\n🛑 Stopping Discord event listener...");
      clearInterval(interval);
      process.exit(0);
    });

    return interval;
  };

  return {
    addChannel,
    updateChannel,
    addSessionThreadRecord,
    getSessionIdByThread,
    listProjects,
    getProjectIdByChannel,
    startEventListener,
  };
};