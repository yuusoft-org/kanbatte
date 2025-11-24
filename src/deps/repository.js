import { createRepository } from "insieme";
import { createClient } from "@libsql/client";
import { decode, encode } from "@msgpack/msgpack";
import { existsSync } from "fs";
import { generateId } from "../utils/helper.js";
import { deserialize, serialize } from "../utils/serialization.js";

export const createInsiemeAdapter = async (deps) => {
  const { dbPath, eventLogTableName, kvStoreTableName } = deps;

  if (!existsSync(dbPath)) {
    throw new Error("Database not found. Please run 'kanbatte db setup' first.");
  }

  const db = createClient({ url: `file:${dbPath}` });

  return {
    getEvents: async (payload = {}) => {
      const { partition, lastOffsetId, filterInit } = payload;

      let sql = `SELECT id, type, payload FROM ${eventLogTableName}`;
      const args = [];
      const conditions = [];

      if (partition) {
        const placeholders = partition.map(() => '?').join(',');
        conditions.push(`partition IN (${placeholders})`);
        args.push(...partition);
      }

      if (filterInit) {
        conditions.push(`type != ?`);
        args.push('init');
      }

      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
      }

      sql += ` ORDER BY created_at`;

      if (lastOffsetId !== undefined && lastOffsetId !== null && lastOffsetId > 0) {
        sql += ` LIMIT -1 OFFSET ?`;
        args.push(lastOffsetId);
      }

      const result = await db.execute({ sql, args });

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        payload: decode(row.payload)
      }));
    },

    appendEvent: async (event) => {
      const { partition, type, payload } = event;
      const serializedPayload = encode(payload);

      await db.execute({
        sql: `INSERT INTO ${eventLogTableName} (id, partition, type, payload, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
        args: [generateId(), partition, type, serializedPayload]
      });
    },

    get: async (key) => {
      const result = await db.execute({
        sql: `SELECT value FROM ${kvStoreTableName} WHERE key = ?`,
        args: [key],
      });

      if (result.rows.length === 0) {
        return null;
      }
      return deserialize(result.rows[0].value);
    },

    set: async (key, value) => {
      await db.execute({
        sql: `INSERT INTO ${kvStoreTableName} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, serialize(value)],
      });
    }
  };
};

export const createInsiemeRepository = async ({ store }) => {
  const repository = createRepository({
    originStore: store,
    usingCachedEvents: false
  });

  await repository.init({
    initialState: {
      events: {
        items: {},
        tree: {}
      }
    },
    partition: "init"
  });

  return repository;
};