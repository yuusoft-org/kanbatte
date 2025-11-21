import { createClient } from "@libsql/client";
import { join } from "path";
import { serialize, deserialize } from "../utils/serialization.js";
import { generateId } from "../utils/helper.js";

export const createInsiemeDeps = async (deps) => {
  const { repository, projectRoot } = deps;
  const dbPath = join(projectRoot, "local.db");
  const db = createClient({ url: `file:${dbPath}` });

  const deps = {
    db,
    repository,
    generateId,
    serialize,
    deserialize
  };

  return deps;
}

export const createInsiemeDao = async (deps) => {
  const { projectRoot, repository, methods } = deps;
  const insiemeDeps = await createInsiemeDeps({ projectRoot, repository });

  // Create insiemeDao object containing all methods
  const insiemeDao = Object.fromEntries(
    Object.entries(methods).map(([methodName, method]) => [
      methodName,
      (...args) => method(insiemeDeps, ...args)
    ])
  );

  return insiemeDao;
};