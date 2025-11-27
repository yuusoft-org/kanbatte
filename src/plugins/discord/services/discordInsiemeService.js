import { createRepository } from "insieme";
import { deserialize, serialize } from "../../../utils/serialization.js";

export const createDiscordInsiemeService = async (deps) => {
  const { discordLibsqlService, eventLogTableName, kvStoreTableName } = deps;

  const isInitialized = async () => {
    try {
      const db = await discordLibsqlService.getClient();
      const result = await db.execute({
        sql: `SELECT id FROM ${eventLogTableName} WHERE partition = 'init' LIMIT 1`,
      });
      return result.rows.length > 0;
    } catch (e) {
      return false;
    }
  };

  const createAdapter = async () => {
    return {
      getEvents: async (payload = {}) => {
        const db = await discordLibsqlService.getClient();
        const { partition, lastOffsetId, filterInit } = payload;
        const partitionValues = partition ? partition.map((p) => `'${p}'`).join(",") : "";
        const partitionClause = partitionValues ? `AND partition IN (${partitionValues})` : "";
        const filterClause = filterInit ? `AND type != 'init'` : "";
        const query = `
          SELECT id, type, payload
          FROM ${eventLogTableName}
          WHERE id > ${lastOffsetId ?? 0}
          ${partitionClause}
          ${filterClause}
          ORDER BY id
        `;
        const result = await db.execute({ sql: query });
        return result.rows.map((row) => ({
          id: row.id,
          type: row.type,
          payload: deserialize(row.payload),
        }));
      },
      appendEvent: async (event) => {
        const db = await discordLibsqlService.getClient();
        const { partition, type, payload } = event;
        const serializedPayload = serialize(payload);
        await db.execute({
          sql: `INSERT INTO ${eventLogTableName} (partition, type, payload, created_at) VALUES (?, ?, ?, datetime('now'))`,
          args: [partition, type, serializedPayload],
        });
      },
      get: async (key) => {
        const db = await discordLibsqlService.getClient();
        const result = await db.execute({
          sql: `SELECT value FROM ${kvStoreTableName} WHERE key = ?`,
          args: [key],
        });
        if (result.rows.length === 0) return null;
        return deserialize(result.rows[0].value);
      },
      set: async (key, value) => {
        const db = await discordLibsqlService.getClient();
        await db.execute({
          sql: `INSERT INTO ${kvStoreTableName} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          args: [key, serialize(value)],
        });
      },
    };
  };

  const store = await createAdapter();
  const repository = createRepository({
    originStore: store,
    usingCachedEvents: false,
  });

  const init = async () => {
    if (await isInitialized()) {
      console.log("Discord Insieme service already initialized.");
      return;
    }
    await repository.init({
      initialState: { events: { items: {}, tree: {} } },
      partition: "init",
    });
  };

  return {
    repository,
    store,
    init,
  };
};