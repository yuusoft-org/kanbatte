import assert from 'assert';
import { promises as fs } from 'fs';
import { parseTaskFile } from '../src/utils/fileParser.js';

const TEST_FILE_PATH = 'test-parser-file.md';

async function cleanupTestFile() {
  try {
    await fs.unlink(TEST_FILE_PATH);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

async function testValidFileFormat() {
  console.log('Testing valid file format...');

  const content = `# ProjectA - Task Title

This is the task description
with multiple lines.`;

  await fs.writeFile(TEST_FILE_PATH, content);

  const result = await parseTaskFile(TEST_FILE_PATH);

  assert(result.projectId === 'ProjectA', 'Project ID should be extracted');
  assert(result.title === 'Task Title', 'Title should be extracted');
  assert(result.description === 'This is the task description\nwith multiple lines.', 'Description should be extracted');

  console.log('Valid file format test passed');
}

async function testInvalidFileFormat() {
  console.log('Testing invalid file format...');

  const content = `Invalid format without proper header`;
  await fs.writeFile(TEST_FILE_PATH, content);

  try {
    await parseTaskFile(TEST_FILE_PATH);
    throw new Error('Should have thrown error for invalid format');
  } catch (error) {
    assert(error.message.includes('must start with #'), 'Should reject files without # header');
  }

  console.log('Invalid file format test passed');
}

async function testMissingFile() {
  console.log('Testing missing file...');

  try {
    await parseTaskFile('non-existent-file.md');
    throw new Error('Should have thrown error for missing file');
  } catch (error) {
    assert(error.message.includes('File not found'), 'Should handle missing files');
  }

  console.log('Missing file test passed');
}

async function runFileParserTests() {
  console.log('Running file parser tests...\n');

  try {
    await cleanupTestFile();

    await testValidFileFormat();
    await testInvalidFileFormat();
    await testMissingFile();

    console.log('\nAll file parser tests passed!');
  } catch (error) {
    console.error('\nFile parser test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestFile();
  }
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runFileParserTests().catch(console.error);
}

export { runFileParserTests };