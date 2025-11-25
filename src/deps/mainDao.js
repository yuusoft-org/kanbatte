import { createLibSqlUmzug } from "umzug-libsql";
import { join } from "path";
import * as insiemeDaoMethods from "../dao/insiemeDao.js";
import { createInsiemeAdapter, createInsiemeRepository } from './repository.js'
import { createInsiemeDao } from "./dao.js";

// Use current working directory for task operations (not CLI file location)
const projectRoot = process.cwd();
const dbPath = join(projectRoot, "local.db");
const migrationsPath = join(projectRoot, "db/migrations/*.sql");

export const setupDB = async () => {
  const { umzug } = createLibSqlUmzug({
    url: `file:${dbPath}`,
    glob: migrationsPath,
  });

  await umzug.up();
}

export const createMainStore = async () => {
  return await createInsiemeAdapter({ 
    dbPath, 
    eventLogTableName: "event_log",
    kvStoreTableName: "kv_store",
  });
}

export const createMainInsiemeDao = async () => {
  const store = await createMainStore();
  const repository = await createInsiemeRepository({ store });
  return await createInsiemeDao({ dbPath, repository, methods: insiemeDaoMethods });
}