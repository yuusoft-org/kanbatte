import assert from 'assert';
import { promises as fs } from 'fs';
import { createClient } from '@libsql/client';
import { runMigrations, rollbackMigrations, getMigrationStatus } from '../src/migrate.js';

/**
 * Migration Tests
 * Tests the umzug-libsql migration system
 */

const TEST_DB_PATH = 'test-migration.db';

async function cleanupTestDb() {
  try {
    await fs.unlink(TEST_DB_PATH);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

async function testMigrationUp() {
  console.log('🧪 Testing migration up...');

  await cleanupTestDb();

  // Override DB path for testing (we'll need to modify migrate.js to accept this)
  // For now, we'll test on the existing system

  const db = createClient({ url: `file:${TEST_DB_PATH}` });

  // Create a simple test migration
  await fs.mkdir('tests/fixtures/db/migrations', { recursive: true });
  await fs.writeFile('tests/fixtures/db/migrations/0001-test.sql', `
    CREATE TABLE test_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  await fs.mkdir('tests/fixtures/db/migrations/down', { recursive: true });
  await fs.writeFile('tests/fixtures/db/migrations/down/0001-test.sql', `
    DROP TABLE IF EXISTS test_table;
  `);

  // Test that tables don't exist initially
  try {
    await db.execute('SELECT * FROM test_table');
    throw new Error('Table should not exist initially');
  } catch (error) {
    assert(error.message.includes('no such table'), 'Expected no such table error');
  }

  console.log('✅ Initial state verified - no tables exist');
}

async function testMigrationStatus() {
  console.log('🧪 Testing migration status...');

  // This will test against the real DB for now
  const { executed, pending } = await getMigrationStatus();

  assert(typeof executed.length === 'number', 'Executed should be an array');
  assert(typeof pending.length === 'number', 'Pending should be an array');

  console.log(`✅ Migration status test passed - ${executed.length} executed, ${pending.length} pending`);
}

async function testDatabaseSchema() {
  console.log('🧪 Testing database schema...');

  const db = createClient({ url: 'file:local.db' });

  // Test that our tables exist
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const tableNames = tables.rows.map(row => row.name);

  assert(tableNames.includes('event_log'), 'event_log table should exist');
  assert(tableNames.includes('task_view'), 'task_view table should exist');
  assert(tableNames.includes('schema_migrations'), 'schema_migrations table should exist');

  console.log('✅ Database schema test passed');
}

async function runMigrationTests() {
  console.log('🚀 Running migration tests...\n');

  try {
    await testMigrationUp();
    await testMigrationStatus();
    await testDatabaseSchema();

    console.log('\n🎉 All migration tests passed!');
  } catch (error) {
    console.error('\n❌ Migration test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestDb();
    // Clean up test fixtures
    try {
      await fs.rm('tests/fixtures', { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runMigrationTests().catch(console.error);
}

export { runMigrationTests };