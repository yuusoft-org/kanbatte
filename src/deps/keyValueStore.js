import { createClient } from "@libsql/client";
import { serialize, deserialize } from "../utils/serialization.js";

export const createKeyValueStore = (deps) => {
  const { dbPath, tableName } = deps;

  const db = createClient({ url: `file:${dbPath}` });

  const get = async (key) => {
    const result = await db.execute({
      sql: `SELECT value FROM ${tableName} WHERE key = ?`,
      args: [key],
    });
    
    if (result.rows.length === 0) {
      return null;
    }
    return deserialize(result.rows[0].value);
  }

  const set = async (key, value) => {
    await db.execute({
      sql: `INSERT INTO ${tableName} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, serialize(value)],
    });
  }
  
  return {
    get,
    set,
  };
}