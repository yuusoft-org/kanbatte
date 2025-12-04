import { createClient } from "@libsql/client";
import { createLibSqlUmzug } from "umzug-libsql";
import { serialize, deserialize } from "../utils/serialization.js";
import { generateId } from "../utils/helper.js";

export const createLibsqlInfra = (config) => {
  const { dbPath, migrationsPath, tableNames } = config;
  const { eventLog, view, kvStore, sessionThreadRecord } = tableNames;

  let db;

  const checkInitialized = () => {
    if (!db) {
      throw new Error("Database service has not been initialized. Please run the appropriate 'db setup' command first.");
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
      sql: `INSERT INTO ${eventLog} (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`,
      args: [partition, type, serializedPayload],
    });
  };

  const getEvents = async (partition) => {
    checkInitialized();
    const result = await db.execute({
      sql: `SELECT id, type, payload FROM ${eventLog} WHERE partition = ? ORDER BY id`,
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
      sql: `SELECT value FROM ${kvStore} WHERE key = ?`,
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
      sql: `INSERT INTO ${kvStore} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, serializedValue],
    });
  };

  const setView = async (key, data, lastEventId) => {
    checkInitialized();
    const viewData = serialize(data);
    const now = Date.now();
    const existing = await db.execute({
      sql: `SELECT id FROM ${view} WHERE key = ?`,
      args: [key],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE ${view} SET data = ?, last_offset_id = ?, updated_at = ? WHERE key = ?`,
        args: [viewData, lastEventId, now, key],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO ${view} (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [generateId(), key, viewData, lastEventId, now, now],
      });
    }
  };

  const setDiscordView = async (key, data) => {
    checkInitialized();
    const viewData = serialize(data);
    const now = Date.now();
    const existing = await db.execute({
      sql: `SELECT id FROM ${view} WHERE key = ?`,
      args: [key],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE ${view} SET data = ?, updated_at = ? WHERE key = ?`,
        args: [viewData, now, key],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO ${view} (id, key, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        args: [generateId(), key, viewData, now, now],
      });
    }
  };
  
   const getAllEventsSince = async (lastOffsetId) => {
    checkInitialized();
    const result = await db.execute({
      sql: `SELECT id, payload FROM ${eventLog} WHERE id > ? ORDER BY id`,
      args: [lastOffsetId],
    });
    return result.rows.flatMap((row) => {
      const outerPayload = deserialize(row.payload);
      if (!outerPayload?.value?.eventData) {
        return [];
      }

      return [{
        id: row.id,
        ...deserialize(outerPayload.value.eventData),
      }];
    });
  };


  const getView = async (key) => {
    checkInitialized();
    const result = await db.execute({
      sql: `SELECT data FROM ${view} WHERE key = ?`,
      args: [key],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return deserialize(result.rows[0].data);
  };

  const findViewsByPrefix = async (prefix) => {
    checkInitialized();
    const result = await db.execute({
      sql: `SELECT data FROM ${view} WHERE key LIKE ?`,
      args: [`${prefix}%`],
    });
    return result.rows.map((row) => deserialize(row.data));
  };

  const addSessionThreadRecord = async (payload) => {
    checkInitialized();
    if (!sessionThreadRecord) throw new Error("sessionThreadRecord table name not configured.");
    const { sessionId, threadId } = payload;
    await db.execute({
      sql: `INSERT INTO ${sessionThreadRecord} (session_id, thread_id) VALUES (?, ?)`,
      args: [sessionId, threadId],
    });
  };

  const getSessionIdByThread = async (payload) => {
    checkInitialized();
    if (!sessionThreadRecord) throw new Error("sessionThreadRecord table name not configured.");
    const { threadId } = payload;
    const result = await db.execute({
      sql: `SELECT session_id FROM ${sessionThreadRecord} WHERE thread_id = ?`,
      args: [threadId],
    });
    return result.rows.length > 0 ? result.rows[0].session_id : null;
  };

  const getThreadIdBySession = async (payload) => {
    checkInitialized();
    if (!sessionThreadRecord) throw new Error("sessionThreadRecord table name not configured.");
    const { sessionId } = payload;
    const result = await db.execute({
      sql: `SELECT thread_id FROM ${sessionThreadRecord} WHERE session_id = ?`,
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
    setDiscordView,
    getView,
    getAllEventsSince,
    findViewsByPrefix,
    addSessionThreadRecord,
    getSessionIdByThread,
    getThreadIdBySession,
  };
};