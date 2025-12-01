import { createClient } from "@libsql/client";
import { createLibSqlUmzug } from "umzug-libsql";
import { serialize, deserialize } from "../utils/serialization.js";
import { generateId } from "../utils/helper.js";

export const createLibsqlInfra = (deps) => {
  const { dbPath, migrationsPath } = deps;

  let db;

  const checkInitialized = () => {
    if (!db) {
      throw new Error("Database service has not been initialized. Please run 'kanbatte db setup' first.");
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
      sql: `INSERT INTO event_log (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`,
      args: [partition, type, serializedPayload],
    });
  };

  const getEvents = async (partition) => {
    checkInitialized();
    const result = await db.execute({
      sql: "SELECT id, type, payload FROM event_log WHERE partition = ? ORDER BY id",
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
      sql: `SELECT value FROM kv_store WHERE key = ?`,
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
      sql: `INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, serializedValue],
    });
  };

  const setView = async (key, data, lastEventId) => {
    checkInitialized();
    const viewData = serialize(data);
    const now = Date.now();
    const existing = await db.execute({
      sql: "SELECT id FROM view WHERE key = ?",
      args: [key],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE view SET data = ?, last_offset_id = ?, updated_at = ? WHERE key = ?",
        args: [viewData, lastEventId, now, key],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO view (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [generateId(), key, viewData, lastEventId, now, now],
      });
    }
  };

  const getView = async (key) => {
    checkInitialized();
    const result = await db.execute({
      sql: "SELECT data FROM view WHERE key = ?",
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
      sql: "SELECT data FROM view WHERE key LIKE ?",
      args: [`${prefix}%`],
    });
    return result.rows.map((row) => deserialize(row.data));
  };

  return {
    init,
    migrateDb,
    appendEvent,
    getEvents,
    get,
    set,
    setView,
    getView,
    findViewsByPrefix,
  };
};