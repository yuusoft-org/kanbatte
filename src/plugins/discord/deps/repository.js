import { createRepository } from "insieme";
import { createClient } from "@libsql/client";
import { decode, encode } from "@msgpack/msgpack";
import { existsSync } from "fs";
import { join } from "path";
import { generateId } from "../../../utils/helper.js";

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
          sql: `SELECT id, type, payload FROM discord_event_log WHERE partition IN (${placeholders}) ORDER BY created_at`,
          args: partition
        });

        const decodedResult = result.rows.map(row => ({
          id: row.id,
          type: row.type,
          payload: decode(row.payload)
        }));

        return decodedResult;
      } else {
        // No events for full initialization - Insieme will build from partitions
        return [];
      }
    },

    async appendEvent(event) {
      const { partition, type, payload } = event;

      const serializedPayload = encode(payload);

      await db.execute({
        sql: "INSERT INTO discord_event_log (id, partition, type, payload, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
        args: [generateId(), partition, type, serializedPayload]
      });
    }
  };
};

export const createDiscordInsiemeRepository = async () => {
  const projectRoot = process.cwd();
  const dbPath = join(projectRoot, "local.db");

  if (!existsSync(dbPath)) {
    throw new Error("Database not found. Please run 'kanbatte db setup' first.");
  }

  // TODO: check if table discord_event_log exists

  const store = await createInsiemeAdapter(dbPath);

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