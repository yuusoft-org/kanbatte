import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createLibSqlUmzug } from "umzug-libsql";
import { createInsiemeAdapter, createInsiemeRepository } from "../../../deps/repository.js";
import { createInsiemeDao } from "../../../deps/dao.js";
import * as insiemeDaoMethods from "../dao/insiemeDao.js";

// Get project root from main CLI
const projectRoot = process.cwd();
const dbPath = join(projectRoot, "local.db");
const __dirname = dirname(fileURLToPath(import.meta.url));
const discordMigrationsPath = join(__dirname, "../db/migrations/*.sql");

export const setupDiscordDb = async () => {
  if (!existsSync(dbPath)) {
    throw new Error("Main database not found. Please run 'kanbatte db setup' first.");
  }

  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: discordMigrationsPath,
  });

  await umzug.up();
};

export const createDiscordStore = async () => {
  return await createInsiemeAdapter({
    dbPath,
    eventLogTableName: "discord_event_log",
    kvStoreTableName: "discord_kv_store",
  });
}

export const createDiscordInsiemeDao = async () => {
  const store = await createDiscordStore();
  const repository = await createInsiemeRepository({ store });
  return await createInsiemeDao({ dbPath, repository, methods: insiemeDaoMethods });
}