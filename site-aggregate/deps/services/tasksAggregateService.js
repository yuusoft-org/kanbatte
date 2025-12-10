const validateTasksJson = (data, projectUrl) => {
  const errors = [];

  if (typeof data !== "object" || data === null) {
    errors.push("JSON root must be an object");
    return errors;
  }

  if (!Array.isArray(data.todo)) {
    errors.push('Missing or invalid "todo" array');
  }

  if (!Array.isArray(data.done)) {
    errors.push('Missing or invalid "done" array');
  }

  if (typeof data.meta !== "object" || data.meta === null) {
    errors.push('Missing or invalid "meta" object');
  } else {
    if (typeof data.meta.total !== "number") {
      errors.push("meta.total must be a number");
    }
    if (typeof data.meta.todo !== "number") {
      errors.push("meta.todo must be a number");
    }
    if (typeof data.meta.done !== "number") {
      errors.push("meta.done must be a number");
    }
  }

  const validateTask = (task, index, arrayName) => {
    const prefix = `${arrayName}[${index}]`;
    if (typeof task.id !== "string") {
      errors.push(`${prefix}.id must be a string`);
    }
    if (typeof task.filename !== "string") {
      errors.push(`${prefix}.filename must be a string`);
    }
    if (typeof task.data !== "object" || task.data === null) {
      errors.push(`${prefix}.data must be an object`);
    } else {
      if (typeof task.data.title !== "string") {
        errors.push(`${prefix}.data.title must be a string`);
      }
      if (typeof task.data.status !== "string") {
        errors.push(`${prefix}.data.status must be a string`);
      }
      if (typeof task.data.priority !== "string") {
        errors.push(`${prefix}.data.priority must be a string`);
      }
    }
  };

  if (Array.isArray(data.todo)) {
    data.todo.forEach((task, i) => validateTask(task, i, "todo"));
  }
  if (Array.isArray(data.done)) {
    data.done.forEach((task, i) => validateTask(task, i, "done"));
  }

  if (errors.length > 0) {
    console.error(`Validation errors for ${projectUrl}/tasks.json:`, errors);
  }

  return errors;
};

const createTasksAggregateService = () => {
  let refreshIntervalId = null;
  let timeUpdateIntervalId = null;

  return {
    async fetchConfig() {
      const timestamp = Date.now();
      const response = await fetch(`./kanbatte.config.json?t=${timestamp}`);
      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }
      return response.json();
    },

    async fetchAllTasks(config) {
      const allTasks = [];

      for (const workspace of config.workspaces) {
        for (const project of workspace.projects) {
          try {
            const timestamp = Date.now();
            const response = await fetch(`${project.url}/tasks.json?t=${timestamp}`);
            if (response.ok) {
              const data = await response.json();

              const validationErrors = validateTasksJson(data, project.url);
              if (validationErrors.length > 0) {
                console.warn(
                  `Skipping ${project.url} due to validation errors`,
                );
                continue;
              }

              const tasks = [...(data.todo || []), ...(data.done || [])];

              for (const task of tasks) {
                allTasks.push({
                  id: task.id,
                  filename: task.filename,
                  title: task.data?.title || task.title,
                  status: task.data?.status || task.status,
                  priority: task.data?.priority || task.priority,
                  assignee: task.data?.assignee || null,
                  labels: task.data?.labels || [],
                  url: project.url,
                  projectName: project.name,
                  workspaceName: workspace.name,
                });
              }
            }
          } catch (err) {
            console.warn(
              `Failed to fetch tasks from ${project.url}:`,
              err.message,
            );
          }
        }
      }

      return allTasks;
    },

    startAutoRefresh(onRefresh) {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
      refreshIntervalId = setInterval(async () => {
        try {
          await onRefresh();
        } catch (err) {
          console.warn("Auto-refresh failed:", err.message);
        }
      }, 60000);
    },

    stopAutoRefresh() {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    },

    startTimeUpdate(onTick) {
      if (timeUpdateIntervalId) {
        clearInterval(timeUpdateIntervalId);
      }
      timeUpdateIntervalId = setInterval(onTick, 1000);
    },

    stopTimeUpdate() {
      if (timeUpdateIntervalId) {
        clearInterval(timeUpdateIntervalId);
        timeUpdateIntervalId = null;
      }
    },
  };
};

export { createTasksAggregateService };
