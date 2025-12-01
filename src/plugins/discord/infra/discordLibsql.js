import { createClient } from "@libsql/client";
import { createLibSqlUmzug } from "umzug-libsql";
import { serialize, deserialize } from "../../../utils/serialization.js";
import { generateId } from "../../../utils/helper.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const createDiscordLibsqlInfra = (deps) => {
  const { dbPath } = deps;
  const migrationsPath = join(__dirname, "../db/migrations/*.sql");

  let db;

  const checkInitialized = () => {
    if (!db) {
      throw new Error("Discord database service has not been initialized. Please run 'kanbatte discord db setup' first.");
    }
  };

  const init = () => {
    if (db) {
      return;
    }
    db = createClient({ url: `file:${dbPath}` });
  };

  const migrateDb = async () => {
    checkInitialized();
    const { umzug } = createLibSqlUmzug({
      url: `file:${dbPath}`,
      glob: migrationsPath,
    });
    await umzug.up();
  };

  const appendEvent = async (event) => {
    checkInitialized();
    const { partition, type, payload } = event;
    const serializedPayload = serialize(payload);
    await db.execute({
      sql: `INSERT INTO discord_event_log (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`,
      args: [partition, type, serializedPayload],
    });
  };

  const getEvents = async (partition) => {
    checkInitialized();
    const result = await db.execute({
      sql: "SELECT id, type, payload FROM discord_event_log WHERE partition = ? ORDER BY id",
      args: [partition],
    });
    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      payload: deserialize(row.payload),
    }));
  };

  const get = async (key) => {
    checkInitialized();
    const result = await db.execute({
      sql: `SELECT value FROM discord_kv_store WHERE key = ?`,
      args: [key],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return deserialize(result.rows[0].value);
  };

  const set = async (key, value) => {
    checkInitialized();
    const serializedValue = serialize(value);
    await db.execute({
      sql: `INSERT INTO discord_kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, serializedValue],
    });
  };

  const setView = async (key, data) => {
    checkInitialized();
    const viewData = serialize(data);
    const now = Date.now();
    const existing = await db.execute({
      sql: "SELECT id FROM discord_view WHERE key = ?",
      args: [key],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE discord_view SET data = ?, updated_at = ? WHERE key = ?",
        args: [viewData, now, key],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO discord_view (id, key, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        args: [generateId(), key, viewData, now, now],
      });
    }
  };

  const findViewsByPrefix = async (prefix) => {
    checkInitialized();
    const result = await db.execute({
      sql: "SELECT data FROM discord_view WHERE key LIKE ?",
      args: [`${prefix}%`],
    });
    return result.rows.map((row) => deserialize(row.data));
  };

  const addSessionThreadRecord = async (payload) => {
    checkInitialized();
    const { sessionId, threadId } = payload;
    await db.execute({
      sql: "INSERT INTO discord_session_thread_record (session_id, thread_id) VALUES (?, ?)",
      args: [sessionId, threadId],
    });
  };

  const getSessionIdByThread = async (payload) => {
    checkInitialized();
    const { threadId } = payload;
    const result = await db.execute({
      sql: "SELECT session_id FROM discord_session_thread_record WHERE thread_id = ?",
      args: [threadId],
    });
    return result.rows.length > 0 ? result.rows[0].session_id : null;
  };

  const getThreadIdBySession = async (payload) => {
    checkInitialized();
    const { sessionId } = payload;
    const result = await db.execute({
      sql: "SELECT thread_id FROM discord_session_thread_record WHERE session_id = ?",
      args: [sessionId],
    });
    return result.rows.length > 0 ? result.rows[0].thread_id : null;
  };

  return {
    init,
    migrateDb,
    appendEvent,
    getEvents,
    get,
    set,
    setView,
    findViewsByPrefix,
    addSessionThreadRecord,
    getSessionIdByThread,
    getThreadIdBySession,
  };
};