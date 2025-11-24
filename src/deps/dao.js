import { createClient } from "@libsql/client";
import { serialize, deserialize } from "../utils/serialization.js";
import { generateId } from "../utils/helper.js";

export const createInsiemeDeps = async (deps) => {
  const { repository, dbPath } = deps;
  const db = createClient({ url: `file:${dbPath}` });

  const insiemeDeps = {
    db,
    repository,
    generateId,
    serialize,
    deserialize
  };

  return insiemeDeps;
}

export const createInsiemeDao = async (deps) => {
  const { dbPath, repository, methods } = deps;
  const insiemeDeps = await createInsiemeDeps({ dbPath, repository });

  // Create insiemeDao object containing all methods
  const insiemeDao = Object.fromEntries(
    Object.entries(methods).map(([methodName, method]) => [
      methodName,
      (...args) => method(insiemeDeps, ...args)
    ])
  );

  return insiemeDao;
};