import assert from 'assert';
import { promises as fs } from 'fs';
import { createClient } from '@libsql/client';
import * as libsqlDao from '../src/dao/libsqlDao.js';
import { generateId } from '../src/utils/serialization.js';

/**
 * Task CRUD Tests
 * Tests task creation, reading, listing functionality
 */

const TEST_DB_PATH = 'test-tasks.db';

async function setupTestDb() {
  const db = createClient({ url: `file:${TEST_DB_PATH}` });

  // Create tables for testing
  await db.execute(`
    CREATE TABLE IF NOT EXISTS event_log (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS task_view (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      data BLOB NOT NULL,
      last_offset_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  return db;
}

async function cleanupTestDb() {
  try {
    await fs.unlink(TEST_DB_PATH);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

async function testTaskCreation() {
  console.log('🧪 Testing task creation...');

  const db = await setupTestDb();
  const deps = { db };

  const taskData = {
    title: 'Test Task',
    description: 'This is a test task',
    projectId: 'TEST-PROJECT',
    status: 'ready'
  };

  const result = await libsqlDao.createTask(deps, taskData);

  assert(result.taskId, 'Task should have an ID');
  assert(result.title === taskData.title, 'Task title should match');
  assert(result.description === taskData.description, 'Task description should match');
  assert(result.projectId === taskData.projectId, 'Task project should match');
  assert(result.status === taskData.status, 'Task status should match');

  console.log('✅ Task creation test passed');
  return result.taskId;
}

async function testTaskReading(taskId) {
  console.log('🧪 Testing task reading...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  const task = await libsqlDao.getTaskById(deps, taskId);

  assert(task !== null, 'Task should be found');
  assert(task.id === taskId, 'Task ID should match');
  assert(task.title === 'Test Task', 'Task title should match');

  console.log('✅ Task reading test passed');
}

async function testTaskListing() {
  console.log('🧪 Testing task listing...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  // Create another task for listing test
  const taskData2 = {
    title: 'Second Test Task',
    description: 'Another test task',
    projectId: 'TEST-PROJECT',
    status: 'ready'
  };

  await libsqlDao.createTask(deps, taskData2);

  // List tasks
  const tasks = await libsqlDao.listTasks(deps, 'TEST-PROJECT');

  assert(tasks.length >= 2, 'Should have at least 2 tasks');
  assert(tasks.every(task => task.projectId === 'TEST-PROJECT'), 'All tasks should belong to TEST-PROJECT');

  console.log('✅ Task listing test passed');
}

async function testTaskListingWithStatusFilter() {
  console.log('🧪 Testing task listing with status filter...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  // Create a task with different status
  const taskData3 = {
    title: 'Third Test Task',
    description: 'Task with different status',
    projectId: 'TEST-PROJECT',
    status: 'in-progress'
  };

  await libsqlDao.createTask(deps, taskData3);

  // List only ready tasks
  const readyTasks = await libsqlDao.listTasks(deps, 'TEST-PROJECT', 'ready');
  const inProgressTasks = await libsqlDao.listTasks(deps, 'TEST-PROJECT', 'in-progress');

  assert(readyTasks.every(task => task.status === 'ready'), 'All returned tasks should be ready');
  assert(inProgressTasks.every(task => task.status === 'in-progress'), 'All returned tasks should be in-progress');
  assert(inProgressTasks.length >= 1, 'Should have at least 1 in-progress task');

  console.log('✅ Task status filtering test passed');
}

async function testNonExistentTask() {
  console.log('🧪 Testing non-existent task reading...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  const nonExistentId = generateId();
  const task = await libsqlDao.getTaskById(deps, nonExistentId);

  assert(task === null, 'Non-existent task should return null');

  console.log('✅ Non-existent task test passed');
}

async function testTaskUpdate(taskId) {
  console.log('🧪 Testing task update...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  const updates = {
    status: 'in-progress',
    title: 'Updated Test Task'
  };

  const updatedTask = await libsqlDao.updateTask(deps, taskId, updates);

  assert(updatedTask.status === 'in-progress', 'Task status should be updated');
  assert(updatedTask.title === 'Updated Test Task', 'Task title should be updated');
  assert(updatedTask.description === 'This is a test task', 'Description should remain unchanged');

  const retrievedTask = await libsqlDao.getTaskById(deps, taskId);
  assert(retrievedTask.status === 'in-progress', 'Updated status should persist');
  assert(retrievedTask.title === 'Updated Test Task', 'Updated title should persist');

  console.log('✅ Task update test passed');
}

async function testInvalidTaskUpdate() {
  console.log('🧪 Testing invalid task update...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  try {
    await libsqlDao.updateTask(deps, 'non-existent-id', { status: 'done' });
    throw new Error('Should have thrown error for non-existent task');
  } catch (error) {
    assert(error.message.includes('Task not found'), 'Should throw task not found error');
  }

  console.log('✅ Invalid task update test passed');
}

async function testCommentCreation(taskId) {
  console.log('🧪 Testing comment creation...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  const commentData = {
    taskId,
    content: 'This is a test comment'
  };

  const comment = await libsqlDao.createComment(deps, commentData);

  assert(comment.id, 'Comment should have an ID');
  assert(comment.taskId === taskId, 'Comment should be linked to task');
  assert(comment.content === commentData.content, 'Comment content should match');
  assert(comment.createdAt, 'Comment should have creation timestamp');

  console.log('✅ Comment creation test passed');
  return comment.id;
}

async function testCommentRetrieval(taskId) {
  console.log('🧪 Testing comment retrieval...');

  const db = createClient({ url: `file:${TEST_DB_PATH}` });
  const deps = { db };

  const comments = await libsqlDao.getCommentsByTaskId(deps, taskId);

  assert(comments.length >= 1, 'Should have at least one comment');
  assert(comments[0].taskId === taskId, 'Comments should belong to the task');
  assert(comments[0].content, 'Comments should have content');

  console.log('✅ Comment retrieval test passed');
}

async function runTaskTests() {
  console.log('🚀 Running task CRUD tests...\n');

  try {
    await cleanupTestDb();

    const taskId = await testTaskCreation();
    await testTaskReading(taskId);
    await testTaskUpdate(taskId);
    await testCommentCreation(taskId);
    await testCommentRetrieval(taskId);
    await testTaskListing();
    await testTaskListingWithStatusFilter();
    await testNonExistentTask();
    await testInvalidTaskUpdate();

    console.log('\n🎉 All task tests passed!');
  } catch (error) {
    console.error('\n❌ Task test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestDb();
  }
}

// Run tests if this file is executed directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runTaskTests().catch(console.error);
}

export { runTaskTests };