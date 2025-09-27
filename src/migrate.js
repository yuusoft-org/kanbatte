import path from "path";
import { fileURLToPath } from "url";
import { createLibSqlUmzug } from "../umzug-libsql/src/umzug-libsql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Migration system using proper umzug-libsql implementation
 */

export async function runMigrations() {
  console.log("🔄 Running database migrations...");

  const { umzug, client } = createLibSqlUmzug({
    url: "file:local.db",
    glob: "db/migrations/*.sql",
  });

  try {
    const pending = await umzug.pending();

    if (pending.length === 0) {
      console.log("✅ No pending migrations");
      return { umzug, client };
    }

    console.log(`⏳ Found ${pending.length} pending migration(s):`);
    pending.forEach((migration) => {
      console.log(`   📄 ${migration.name}`);
    });

    const executed = await umzug.up();

    if (executed.length > 0) {
      console.log(`🎉 Successfully executed ${executed.length} migration(s):`);
      executed.forEach((migration) => {
        console.log(`   ✅ ${migration.name}`);
      });
    }

    return { umzug, client };
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

export async function rollbackMigrations(steps = 1) {
  console.log(`🔄 Rolling back ${steps} migration(s)...`);

  const { umzug, client } = createLibSqlUmzug({
    url: "file:local.db",
    glob: "db/migrations/*.sql",
    confirmBeforeDown: true,
  });

  try {
    const executed = await umzug.down({ step: steps });

    if (executed.length > 0) {
      console.log(
        `🎉 Successfully rolled back ${executed.length} migration(s):`
      );
      executed.forEach((migration) => {
        console.log(`   ↩️ ${migration.name}`);
      });
    } else {
      console.log("✅ No migrations to rollback");
    }

    return { umzug, client };
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  }
}

export async function getMigrationStatus() {
  const { umzug, client } = createLibSqlUmzug({
    url: "file:local.db",
    glob: "db/migrations/*.sql",
  });

  const executed = await umzug.executed();
  const pending = await umzug.pending();

  console.log("\n📊 Migration Status:");
  console.log(`✅ Executed: ${executed.length}`);
  executed.forEach((migration) => {
    console.log(`   ✓ ${migration.name}`);
  });

  console.log(`⏳ Pending: ${pending.length}`);
  pending.forEach((migration) => {
    console.log(`   ⚪ ${migration.name}`);
  });

  return { executed, pending, umzug, client };
}

// Run migrations if this file is executed directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  console.log("🚀 Starting migration runner...");
  runMigrations()
    .then(() => {
      console.log("✅ Migration runner completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration runner failed:", error);
      process.exit(1);
    });
}
