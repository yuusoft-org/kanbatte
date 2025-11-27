import { createClient } from "@libsql/client";
import { createLibSqlUmzug } from "umzug-libsql";

export const createDiscordLibsqlService = (deps) => {
  const { dbPath, migrationsPath } = deps;

  const db = createClient({ url: `file:${dbPath}` });

  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: migrationsPath,
  });

  const isInitialized = async () => {
    try {
      const rs = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='discord_event_log'");
      return rs.rows.length > 0;
    } catch (e) {
      return false;
    }
  };

  const init = async () => {
    await umzug.up();
  };

  const getClient = async () => {
    if (!(await isInitialized())) {
      throw new Error("Discord database service has not been initialized. Please run 'discord db setup' first.");
    }
    return db;
  };

  return {
    init,
    getClient,
  };
};