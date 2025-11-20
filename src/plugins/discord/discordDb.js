import { createClient } from "@libsql/client";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { generateId } from "../../utils/helper.js";
import { createLibSqlUmzug } from "umzug-libsql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const createDiscordDb = (projectRoot) => {
  const dbPath = join(projectRoot, "local.db");

  if (!existsSync(dbPath)) {
    throw new Error("Database not found. Please run 'kanbatte db setup' first.");
  }

  const db = createClient({ url: `file:${dbPath}` });

  const addDiscordChannel = async (payload) => {
    const { projectId, channelId } = payload;
    await db.execute({
      sql: "INSERT INTO discord_channels (id, project_id, channel_id, created_at) VALUES (?, ?, ?, ?)",
      args: [generateId(), projectId, channelId, Date.now()]
    });
  };

  const updateDiscordChannel = async (payload) => {
    const { projectId, channelId } = payload;
    await db.execute({
      sql: "UPDATE discord_channels SET project_id = ? WHERE channel_id = ?",
      args: [projectId, channelId]
    });
  };

  const getDiscordChannel = async (payload) => {
    const { channelId } = payload;
    const result = await db.execute({
      sql: "SELECT project_id FROM discord_channels WHERE channel_id = ?",
      args: [channelId]
    });

    return result.rows.length > 0 ? result.rows[0].project_id : null;
  };

  const getLastOffset = async () => {
    const result = await db.execute({
      sql: "SELECT MAX(offset_id) as max_offset FROM discord_event_log",
      args: []
    });

    return result.rows[0].max_offset || 0;
  };

  const saveDiscordEvent = async (payload) => {
    const { offsetId, data } = payload;
    await db.execute({
      sql: "INSERT INTO discord_event_log (id, offset_id, data, created_at) VALUES (?, ?, ?, ?)",
      args: [generateId(), offsetId, data, Date.now()]
    });
  };

  return {
    addDiscordChannel,
    updateDiscordChannel,
    getDiscordChannel,
    getLastOffset,
    saveDiscordEvent,
  }
};

export const setupDiscordDb = async (projectRoot) => {
  const dbPath = join(projectRoot, "local.db");

  if (!existsSync(dbPath)) {
    throw new Error("Main database not found. Please run 'kanbatte db setup' first.");
  }

  // Run Discord-specific migrations using umzug-libsql
  const discordMigrationsPath = join(__dirname, "migrations/*.sql");
  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: discordMigrationsPath,
  });

  await umzug.up();
};