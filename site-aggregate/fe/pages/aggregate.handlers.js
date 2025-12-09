export const handleSearchInput = (deps, payload) => {
  const { render, store } = deps;
  const event = payload._event;
  const value = event.detail.value;
  store.setSearchQuery(value);
  render();
};

export const handleSearchKeydown = (deps, payload) => {
  const { render, store } = deps;
  const event = payload._event;
  if (event.key === "Escape") {
    store.setSearchQuery("");
    render();
  }
};

export const handleClearSearch = (deps) => {
  const { render, store } = deps;
  store.setSearchQuery("");
  render();
};

export const handleSortById = (deps) => {
  const { render, store } = deps;
  store.setSortBy("id");
  render();
};

export const handleSortByStatus = (deps) => {
  const { render, store } = deps;
  store.setSortBy("status");
  render();
};

export const handleSortByWorkspace = (deps) => {
  const { render, store } = deps;
  store.setSortBy("workspace");
  render();
};

export const handleSortByPriority = (deps) => {
  const { render, store } = deps;
  store.setSortBy("priority");
  render();
};

export const handleSortByProject = (deps) => {
  const { render, store } = deps;
  store.setSortBy("project");
  render();
};

export const handleToggleOrder = (deps) => {
  const { render, store } = deps;
  store.toggleSortOrder();
  render();
};

export const handleAfterMount = async (deps) => {
  const { render, store, taskAggregateService } = deps;

  try {
    store.setLoading(true);
    render();

    const config = await taskAggregateService.fetchConfig();
    store.setConfig(config);

    const tasks = await taskAggregateService.fetchAllTasks(config);
    store.setTasks(tasks);
    render();
  } catch (err) {
    store.setError(err.message);
    render();
  }

  taskAggregateService.startAutoRefresh(async () => {
    const config = store.selectConfig();
    if (config) {
      const tasks = await taskAggregateService.fetchAllTasks(config);
      store.setTasks(tasks);
      render();
    }
  });
  taskAggregateService.startTimeUpdate(render);
};

export const handleTaskListClick = (deps, payload) => {
  const { render, store } = deps;
  const event = payload._event;
  const target = event.target;

  const filterEl = target.closest("[data-filter]");
  if (!filterEl) return;

  const value = filterEl.getAttribute("data-value");
  const filterType = filterEl.getAttribute("data-filter");

  if (filterType && value) {
    event.preventDefault();
    event.stopPropagation();
    const currentQuery = store.getState().searchQuery;
    // Wrap value in quotes if it contains spaces
    const formattedValue = value.includes(" ") ? `"${value}"` : value;
    const newFilter = `${filterType}:${formattedValue}`;
    const newQuery = currentQuery ? `${currentQuery} ${newFilter}` : newFilter;
    store.setSearchQuery(newQuery);
    render();
  }
};
