import { Umzug } from "umzug";
import { createClient } from "@libsql/client";
import fs from "fs";
import readline from "readline";

/**
 * @import { Client } from "@libsql/client";
 * @import { UmzugStorage, Resolver } from "umzug";
 */

const MIGRATIONS_TABLE_NAME = "schema_migrations";

const CREATE_MIGRATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE_NAME} (
  name TEXT PRIMARY KEY,
  created TEXT DEFAULT (datetime('now'))
)`;

/**
 * Extracts the migration name from a filename
 * @param {string} filename
 * @returns {string}
 */
const extractMigrationName = (filename) => {
  return filename.split(".").slice(0, -1).join(".");
};

/**
 * Class representing a storage implementation for Umzug using LibSQL.
 * This class provides methods for logging and retrieving migration information.
 *
 * @implements UmzugStorage
 */
export class LibSqlStorage {
  /**
   *
   * @param {Client} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * @private
   */
  async _createMigrationsTable() {
    await this.db.execute(CREATE_MIGRATIONS_TABLE_SQL);
  }

  async logMigration({ name }) {
    await this.db.execute({
      sql: `INSERT INTO ${MIGRATIONS_TABLE_NAME} (name) VALUES (?)`,
      args: [name],
    });
  }

  async unlogMigration({ name }) {
    await this.db.execute({
      sql: `DELETE FROM ${MIGRATIONS_TABLE_NAME} WHERE name = ?`,
      args: [name],
    });
  }

  async executed() {
    let res;
    try {
      res = await this.db.execute(`SELECT name FROM ${MIGRATIONS_TABLE_NAME}`);
    } catch (error) {
      if (!error.message.endsWith(`no such table: ${MIGRATIONS_TABLE_NAME}`)) {
        throw error;
      }
      await this._createMigrationsTable();
      res = await this.db.execute(`SELECT name FROM ${MIGRATIONS_TABLE_NAME}`);
    }

    /**
     * @type {string[]}
     */
    const names = res.rows.map(
      /**
       * @param {object} item
       * @returns {string}
       */
      (item) => item.name
    );
    return names;
  }
}

/**
 * @typedef {Object} UzmugResolverParam
 */

/**
 * Creates a migration function for LibSQL to execute up and down migrations
 * @param {Client} db
 * @param {object} [options={}]
 * @param {boolean} [options.confirmBeforeDown=false] - Whether to prompt for confirmation before running down migrations.
 * @returns {Resolver<object>}
 */
export const createLibSqlResolver = (db, { confirmBeforeDown = false } = {}) => {
  let proceed;
  return (params) => {
    return {
      name: extractMigrationName(params.name),
      up: async () => {
        if (!params.path) {
          throw new Error("Path is required");
        }
        const sqlContent = fs.readFileSync(params.path, "utf-8");
        await db.execute(sqlContent);
      },
      down: async () => {
        if (!params.path) {
          throw new Error("Path is required");
        }
        if (confirmBeforeDown && proceed === undefined) {
          const read = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          proceed = await new Promise((resolve) => {
            read.question("Do you want to proceed with the down migration/s? (y/n): ", (answer) => {
              resolve(answer.toLowerCase() === "y");
            });
          });
          read.close();
          if (!proceed) {
            console.log("Down migration cancelled.");
            process.exit(1);
          }
        }
        const sqlContent = fs.readFileSync(
          params.path?.replace("/migrations/", "/migrations/down/"),
          "utf-8"
        );
        await db.execute(sqlContent);
      },
    };
  };
};


/**
 * @typedef {Object} UmzugResponse
 * @property {Umzug} umzug
 * @property {Client} client
 */

/**
 * Creates a new Umzug instance for managing migrations with LibSQL.
 * @param {Object} param0 - Configuration object.
 * @param {string=} param0.url - The database URL. Defaults to ':memory:'.
 * @param {string=} param0.authToken - The authentication token.
 * @param {string=} param0.glob - The glob pattern for migration files. Defaults to 'db/migrations/*.sql'.
 * @param {boolean=} param0.confirmBeforeDown - Whether to prompt for confirmation before running down migrations. Defaults to false.
 * @returns {UmzugResponse} - The Umzug instance and the db client.
 */
export const createLibSqlUmzug = ({url = ':memory:', authToken, glob = 'db/migrations/*.sql', confirmBeforeDown = false} = {}) => {
  const client = createClient({
    // @ts-ignore
    url,
    authToken,
  });
  
  const storage = new LibSqlStorage(client);
  
  const umzug = new Umzug({
    migrations: {
      glob,
      resolve: createLibSqlResolver(client, { confirmBeforeDown }),
    },
    logger: console,
    storage,
  });

  return { umzug, client };
};



