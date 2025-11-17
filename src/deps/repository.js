import { createRepository } from "insieme";
import { createClient } from "@libsql/client";
import { decode, encode } from "@msgpack/msgpack";
import { existsSync } from "fs";

const createInsiemeAdapter = async (dbPath) => {
  const db = createClient({ url: `file:${dbPath}` });

  return {
    // Insieme store interface - supports partitioning
    async getEvents(payload = {}) {
      const { partition } = payload;

      if (partition) {
        // Get events for specific partitions
        const placeholders = partition.map(() => '?').join(',');
        const result = await db.execute({
          sql: `SELECT type, payload FROM events WHERE partition IN (${placeholders}) ORDER BY created_at`,
          args: partition
        });

        return result.rows.map(row => ({
          type: row.type,
          payload: decode(row.payload)
        }));
      } else {
        // No events for full initialization - Insieme will build from partitions
        return [];
      }
    },

    async appendEvent(event) {
      const { partition, type, payload } = event;
      const serializedPayload = encode(payload);

      await db.execute({
        sql: "INSERT INTO events (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))",
        args: [partition, type, serializedPayload]
      });
    }
  };
};

export const createInsiemeRepository = async () => {
  const dbPath = join(projectRoot, "local.db");

  if (!existsSync(dbPath)) {
    throw new Error("Database not found. Please run 'kanbatte db setup' first.");
  }

  const store = await createInsiemeAdapter(dbPath);

  const repository = createRepository({
    originStore: store,
    usingCachedEvents: false
  });

  await repository.init({
    initialState: {
      sessions: {},
      projects: {}
    }
  });

  return repository;
};