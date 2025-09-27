
import { serialize, deserialize, generateId, createEvent } from '../utils/serialization.js';

export const addEventLog = async (deps, payload) => {
  const { db } = deps;

  // Create event for the event log
  const eventData = createEvent('task_created', payload.taskId, payload);
  const eventId = generateId();
  const serializedData = serialize(eventData);

  // Insert into event_log
  await db.execute({
    sql: 'INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)',
    args: [eventId, payload.taskId, serializedData, Date.now()]
  });

  return eventId;
};

export const createTask = async (deps, taskData) => {
  const { db } = deps;

  const taskId = taskData.taskId || generateId();

  // Add to event log
  const eventId = await addEventLog(deps, { ...taskData, taskId });

  // Create/update view table entry
  const viewData = {
    id: taskId,
    title: taskData.title,
    description: taskData.description || '',
    status: taskData.status || 'ready',
    projectId: taskData.projectId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const serializedViewData = serialize(viewData);

  await db.execute({
    sql: 'INSERT OR REPLACE INTO task_view (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      taskId,
      `task:${taskId}`,
      serializedViewData,
      eventId,
      Date.now(),
      Date.now()
    ]
  });

  return { taskId, ...viewData };
};

export const getTaskById = async (deps, taskId) => {
  const { db } = deps;

  const result = await db.execute({
    sql: 'SELECT data FROM task_view WHERE key = ?',
    args: [`task:${taskId}`]
  });

  if (result.rows.length === 0) {
    return null;
  }

  return deserialize(result.rows[0].data);
};

export const listTasks = async (deps, projectId, statusFilter = null) => {
  const { db } = deps;

  let sql = 'SELECT data FROM task_view WHERE key LIKE ?';
  let args = ['task:%'];

  if (projectId) {
    // For now, we'll filter in memory since we don't have project filtering in the query
    // In a real implementation, we might add project indexing
  }

  const result = await db.execute({ sql, args });

  let tasks = result.rows.map(row => deserialize(row.data));

  // Filter by project if specified
  if (projectId) {
    tasks = tasks.filter(task => task.projectId === projectId);
  }

  // Filter by status if specified
  if (statusFilter) {
    const statuses = statusFilter.split(',').map(s => s.trim());
    tasks = tasks.filter(task => statuses.includes(task.status));
  }

  return tasks;
};

export const updateTask = async (deps, taskId, updates) => {
  const { db } = deps;

  const currentTask = await getTaskById(deps, taskId);
  if (!currentTask) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const allowedUpdates = ['status', 'title', 'description'];
  const validUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key) && value !== undefined) {
      validUpdates[key] = value;
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    throw new Error('No valid updates provided');
  }

  const eventData = createEvent('task_updated', taskId, validUpdates);
  const eventId = generateId();
  const serializedData = serialize(eventData);

  await db.execute({
    sql: 'INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)',
    args: [eventId, taskId, serializedData, Date.now()]
  });

  const updatedTask = {
    ...currentTask,
    ...validUpdates,
    updatedAt: Date.now()
  };

  const serializedViewData = serialize(updatedTask);

  await db.execute({
    sql: 'UPDATE task_view SET data = ?, last_offset_id = ?, updated_at = ? WHERE key = ?',
    args: [serializedViewData, eventId, Date.now(), `task:${taskId}`]
  });

  return updatedTask;
};

export const createComment = async (deps, commentData) => {
  const { db } = deps;

  const task = await getTaskById(deps, commentData.taskId);
  if (!task) {
    throw new Error(`Task not found: ${commentData.taskId}`);
  }

  const commentId = generateId();
  const timestamp = Date.now();

  const eventData = createEvent('comment_added', commentData.taskId, {
    commentId,
    content: commentData.content
  });
  const eventId = generateId();
  const serializedData = serialize(eventData);

  await db.execute({
    sql: 'INSERT INTO event_log (id, key, data, created_at) VALUES (?, ?, ?, ?)',
    args: [eventId, commentData.taskId, serializedData, timestamp]
  });

  const comment = {
    id: commentId,
    taskId: commentData.taskId,
    content: commentData.content,
    createdAt: timestamp
  };

  const serializedComment = serialize(comment);

  await db.execute({
    sql: 'INSERT INTO task_view (id, key, data, last_offset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      commentId,
      `comment:${commentId}`,
      serializedComment,
      eventId,
      timestamp,
      timestamp
    ]
  });

  return comment;
};

export const getCommentsByTaskId = async (deps, taskId) => {
  const { db } = deps;

  const result = await db.execute({
    sql: 'SELECT data FROM task_view WHERE key LIKE ? ORDER BY created_at ASC',
    args: [`comment:%`]
  });

  const comments = result.rows
    .map(row => deserialize(row.data))
    .filter(comment => comment.taskId === taskId);

  return comments;
};

