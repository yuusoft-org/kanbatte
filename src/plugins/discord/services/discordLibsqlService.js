import { createClient } from "@libsql/client";
import { createLibSqlUmzug } from "umzug-libsql";

export const createDiscordLibsqlService = (deps) => {
  const { dbPath, migrationsPath } = deps;

  let isInitialized = false;
  const db = createClient({ url: `file:${dbPath}` });

  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: migrationsPath,
  });

  const init = async () => {
    if (isInitialized) {
      return;
    }
    await umzug.up();
    isInitialized = true;
  };

  const getClient = () => {
    if (!isInitialized) {
      throw new Error("Discord database service has not been initialized. Please call init() before using the database.");
    }
    return db;
  };

  return {
    init,
    getClient,
  };
};