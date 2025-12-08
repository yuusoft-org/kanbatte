let refreshInterval = null;
let timeUpdateInterval = null;

export const handleSearchInput = (deps, payload) => {
  const event = payload._event;
  const value = event.detail.value;
  deps.store.setSearchQuery(value);
  deps.render();
};

export const handleSearchKeydown = (deps, payload) => {
  const event = payload._event;
  if (event.key === "Escape") {
    deps.store.setSearchQuery("");
    deps.render();
  }
};

export const handleClearSearch = (deps) => {
  deps.store.setSearchQuery("");
  deps.render();
};

export const handleSortById = (deps) => {
  deps.store.setSortBy("id");
  deps.render();
};

export const handleSortByStatus = (deps) => {
  deps.store.setSortBy("status");
  deps.render();
};

export const handleSortByWorkspace = (deps) => {
  deps.store.setSortBy("workspace");
  deps.render();
};

export const handleSortByPriority = (deps) => {
  deps.store.setSortBy("priority");
  deps.render();
};

export const handleSortByProject = (deps) => {
  deps.store.setSortBy("project");
  deps.render();
};

export const handleToggleOrder = (deps) => {
  deps.store.toggleSortOrder();
  deps.render();
};

export const handleAfterMount = (deps) => {
  loadData(deps);
  startAutoRefresh(deps);
  startTimeUpdate(deps);
};

export const handleTaskListClick = (deps, payload) => {
  const event = payload._event;
  const target = event.target;

  // Find the closest element with data-filter attribute
  const filterEl = target.closest("[data-filter]");
  if (!filterEl) return;

  const value = filterEl.getAttribute("data-value");
  const filterType = filterEl.getAttribute("data-filter");

  if (filterType && value) {
    event.preventDefault();
    event.stopPropagation();
    const currentQuery = deps.store.getState().searchQuery;
    const newFilter = `${filterType}:${value}`;
    const newQuery = currentQuery ? `${currentQuery} ${newFilter}` : newFilter;
    deps.store.setSearchQuery(newQuery);
    deps.render();
  }
};

const fetchConfig = async () => {
  const response = await fetch("./kanbatte.config.json");
  if (!response.ok) {
    throw new Error("Failed to fetch config");
  }
  return response.json();
};

const fetchAllTasks = async (config) => {
  const allTasks = [];

  for (const workspace of config.workspaces) {
    for (const project of workspace.projects) {
      try {
        const response = await fetch(`${project.url}/tasks.json`);
        if (response.ok) {
          const data = await response.json();
          const tasks = data.tasks || [];

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
        console.warn(`Failed to fetch tasks from ${project.url}:`, err.message);
      }
    }
  }

  return allTasks;
};

const loadData = async (deps) => {
  try {
    deps.store.setLoading(true);
    deps.render();

    const config = await fetchConfig();
    deps.store.setConfig(config);

    const tasks = await fetchAllTasks(config);
    deps.store.setTasks(tasks);
    deps.render();
  } catch (err) {
    deps.store.setError(err.message);
    deps.render();
  }
};

const startAutoRefresh = (deps) => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(async () => {
    try {
      const config = deps.store.getState().config;
      if (config) {
        const tasks = await fetchAllTasks(config);
        deps.store.setTasks(tasks);
        deps.render();
      }
    } catch (err) {
      console.warn("Auto-refresh failed:", err.message);
    }
  }, 60000); // 60 seconds
};

const startTimeUpdate = (deps) => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }

  timeUpdateInterval = setInterval(() => {
    deps.render();
  }, 1000); // Update time display every second
};
