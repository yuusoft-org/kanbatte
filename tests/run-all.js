import { runMigrationTests } from './migration.test.js';
import { runTaskTests } from './task.test.js';
import { runFileParserTests } from './file-parser.test.js';

/**
 * Test Runner
 * Runs all test suites
 */

async function runAllTests() {
  console.log('🧪 Kanbatte Test Suite\n');
  console.log('=' .repeat(50));

  try {
    await runMigrationTests();
    console.log('\n' + '='.repeat(50));
    await runTaskTests();
    console.log('\n' + '='.repeat(50));
    await runFileParserTests();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED! 🎉');
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ TEST SUITE FAILED');
    console.error(error);
    process.exit(1);
  }
}

runAllTests();