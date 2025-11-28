import { createClient } from "@libsql/client";
import { createLibSqlUmzug } from "umzug-libsql";
import { generateId } from "../utils/helper.js";

export const createLibsqlInfra = (deps) => {
  const { dbPath, migrationsPath } = deps;

  let db = null;
  let isInitialized = false;

  const checkInitialized = () => {
    if (!isInitialized) {
      throw new Error("Database service has not been initialized. Please run 'kanbatte db setup' first.");
    }
  };

  const init = async () => {
    if (isInitialized) {
      return;
    }
    db = createClient({ url: `file:${dbPath}` });
    isInitialized = true;
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
    await db.execute({
      sql: `INSERT INTO event_log (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`,
      args: [partition, type, payload],
    });
  };

  const getEvents = async (partition) => {
    checkInitialized();
    const result = await db.execute({
      sql: "SELECT id, type, payload FROM event_log WHERE partition = ? ORDER BY id",
      args: [partition],
    });
    return result.rows;
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
    return result.rows[0].value;
  };

  const set = async (key, value) => {
    checkInitialized();
    await db.execute({
      sql: `INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, value],
    });
  };

  const setView = async (key, data, lastEventId) => {
    checkInitialized();
    const now = Date.now();
    const existing = await db.execute({
      sql: "SELECT id FROM view WHERE key = ?",
      args: [key],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE view SET data = ?, last_offset_id = ?, updated_at = ? WHERE key = ?",
        args: [data, lastEventId, now, key],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO view (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [generateId(), key, data, lastEventId, now, now],
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
    return result.rows[0].data;
  };

  const findViewsByPrefix = async (prefix) => {
    checkInitialized();
    const result = await db.execute({
      sql: "SELECT data FROM view WHERE key LIKE ?",
      args: [`${prefix}%`],
    });
    return result.rows.map((row) => row.data);
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