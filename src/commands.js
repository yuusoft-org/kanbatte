import { parseTaskFile } from './utils/fileParser.js';

export const addTask = async (deps, options) => {
  const { libsqlDao } = deps;

  let taskData = {};

  if (options.file) {
    try {
      taskData = await parseTaskFile(options.file);
    } catch (error) {
      console.error(`Error parsing file: ${error.message}`);
      return;
    }
  } else {
    if (!options.title) {
      console.error("Error: Task title is required (use -t or --title, or provide -f for file)");
      return;
    }

    if (!options.project) {
      console.error("Error: Project ID is required (use -p or --project)");
      return;
    }

    taskData = {
      title: options.title,
      description: options.description || "",
      projectId: options.project
    };
  }

  try {
    const task = await libsqlDao.createTask({
      title: taskData.title,
      description: taskData.description,
      projectId: taskData.projectId,
      status: "ready",
    });

    console.log("Task created successfully!");
    console.log(`Task ID: ${task.taskId}`);
    console.log(`Title: ${task.title}`);
    console.log(`Project: ${task.projectId}`);
    console.log(`Status: ${task.status}`);

    if (task.description) {
      console.log(`Description: ${task.description}`);
    }

    return task;
  } catch (error) {
    console.error("Failed to create task:", error.message);
  }
};

export const listTasks = async (deps, options) => {
  const { libsqlDao } = deps;

  try {
    const tasks = await libsqlDao.listTasks(options.project, options.status);

    if (tasks.length === 0) {
      console.log("No tasks found");
      return;
    }

    console.log(`Found ${tasks.length} task(s):`);

    tasks.forEach((task) => {
      console.log(`${task.id} - ${task.title} (${task.status})`);
    });

    return tasks;
  } catch (error) {
    console.error("Failed to list tasks:", error.message);
  }
};

export const readTask = async (deps, taskId) => {
  const { libsqlDao } = deps;

  try {
    const task = await libsqlDao.getTaskById(taskId);

    if (!task) {
      console.log(`Task not found: ${taskId}`);
      return;
    }

    console.log(`ID: ${task.id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Status: ${task.status}`);
    console.log(`Project: ${task.projectId}`);

    if (task.description) {
      console.log(`Description: ${task.description}`);
    }

    console.log(`Created: ${new Date(task.createdAt).toLocaleString()}`);
    console.log(`Updated: ${new Date(task.updatedAt).toLocaleString()}`);

    const comments = await libsqlDao.getCommentsByTaskId(taskId);
    if (comments.length > 0) {
      console.log(`\nComments (${comments.length}):`);
      comments.forEach(comment => {
        console.log(`  ${comment.id}: ${comment.content}`);
        console.log(`    ${new Date(comment.createdAt).toLocaleString()}`);
      });
    }

    return task;
  } catch (error) {
    console.error("Failed to read task:", error.message);
  }
};

export const updateTask = async (deps, options) => {
  const { libsqlDao } = deps;

  if (!options.taskId) {
    console.error("Error: Task ID is required");
    return;
  }

  const updates = {};
  if (options.status) updates.status = options.status;
  if (options.title) updates.title = options.title;
  if (options.description) updates.description = options.description;

  if (Object.keys(updates).length === 0) {
    console.error("Error: At least one field to update is required");
    return;
  }

  const validStatuses = ["ready", "in-progress", "done"];
  if (updates.status && !validStatuses.includes(updates.status)) {
    console.error(
      `Error: Invalid status. Valid options: ${validStatuses.join(", ")}`
    );
    return;
  }

  try {
    const task = await libsqlDao.updateTask(options.taskId, updates);

    console.log("Task updated successfully!");
    console.log(`Task ID: ${task.id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Status: ${task.status}`);
    console.log(`Project: ${task.projectId}`);

    if (task.description) {
      console.log(`Description: ${task.description}`);
    }

    return task;
  } catch (error) {
    console.error("Failed to update task:", error.message);
  }
};

export const addComment = async (deps, options) => {
  const { libsqlDao } = deps;

  if (!options.taskId) {
    console.error("Error: Task ID is required");
    return;
  }

  if (!options.content) {
    console.error("Error: Comment content is required");
    return;
  }

  try {
    const comment = await libsqlDao.createComment({
      taskId: options.taskId,
      content: options.content
    });

    console.log("Comment added successfully!");
    console.log(`Comment ID: ${comment.id}`);
    console.log(`Task ID: ${comment.taskId}`);
    console.log(`Content: ${comment.content}`);

    return comment;
  } catch (error) {
    console.error("Failed to add comment:", error.message);
  }
};
