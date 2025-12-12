import { syncStateToUrl, loadStateFromUrl } from "./aggregate.store.js";

// Debounce helper for search input URL sync
let searchDebounceTimer = null;
const debounceUrlSync = (store, delay = 300) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    syncStateToUrl(store.selectUrlState());
  }, delay);
};

export const handleSearchInput = (deps, payload) => {
  const { render, store } = deps;
  const event = payload._event;
  const value = event.detail.value;
  store.setSearchQuery(value);
  render();
  debounceUrlSync(store);
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
  syncStateToUrl(store.selectUrlState());
};

export const handleSortById = (deps) => {
  const { render, store } = deps;
  store.setSortBy("id");
  render();
  syncStateToUrl(store.selectUrlState());
};

export const handleSortByStatus = (deps) => {
  const { render, store } = deps;
  store.setSortBy("status");
  render();
  syncStateToUrl(store.selectUrlState());
};

export const handleSortByWorkspace = (deps) => {
  const { render, store } = deps;
  store.setSortBy("workspace");
  render();
  syncStateToUrl(store.selectUrlState());
};

export const handleSortByPriority = (deps) => {
  const { render, store } = deps;
  store.setSortBy("priority");
  render();
  syncStateToUrl(store.selectUrlState());
};

export const handleSortByProject = (deps) => {
  const { render, store } = deps;
  store.setSortBy("project");
  render();
  syncStateToUrl(store.selectUrlState());
};

export const handleToggleOrder = (deps) => {
  const { render, store } = deps;
  store.toggleSortOrder();
  render();
  syncStateToUrl(store.selectUrlState());
};

export const handleAfterMount = async (deps) => {
  const { render, store, taskAggregateService } = deps;

  // Load filter/sort state from URL on page load
  loadStateFromUrl(store.selectUrlState());
  render();

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

    // Add to the appropriate filter array
    switch (filterType) {
      case "status":
        store.addFilterStatus(value);
        break;
      case "priority":
        store.addFilterPriority(value);
        break;
      case "workspace":
        store.addFilterWorkspace(value);
        break;
      case "project":
        store.addFilterProject(value);
        break;
      case "assignee":
        store.addFilterAssignee(value);
        break;
      case "label":
        store.addFilterLabel(value);
        break;
    }
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

// Open dropdown handlers
const openDropdownAtButton = (deps, payload) => {
  const { render, store } = deps;
  const rect = payload._event.target.getBoundingClientRect();
  store.openDropdown({ type: payload.type, x: rect.left, y: rect.bottom });
  render();
};

export const handleOpenWorkspaceDropdown = (deps, payload) => {
  openDropdownAtButton(deps, { ...payload, type: "workspace" });
};

export const handleOpenProjectDropdown = (deps, payload) => {
  openDropdownAtButton(deps, { ...payload, type: "project" });
};

export const handleOpenAssigneeDropdown = (deps, payload) => {
  openDropdownAtButton(deps, { ...payload, type: "assignee" });
};

export const handleOpenLabelDropdown = (deps, payload) => {
  openDropdownAtButton(deps, { ...payload, type: "label" });
};

export const handleOpenStatusDropdown = (deps, payload) => {
  openDropdownAtButton(deps, { ...payload, type: "status" });
};

export const handleOpenPriorityDropdown = (deps, payload) => {
  openDropdownAtButton(deps, { ...payload, type: "priority" });
};

// Close dropdown handler
export const handleCloseDropdown = (deps) => {
  const { render, store } = deps;
  store.closeDropdown();
  render();
};

// Dropdown item click handlers
export const handleWorkspaceItemClick = (deps, payload) => {
  const { render, store } = deps;
  const item = payload._event.detail.item;
  if (item?.value) {
    store.addFilterWorkspace(item.value);
    store.closeDropdown();
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

export const handleProjectItemClick = (deps, payload) => {
  const { render, store } = deps;
  const item = payload._event.detail.item;
  if (item?.value) {
    store.addFilterProject(item.value);
    store.closeDropdown();
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

export const handleAssigneeItemClick = (deps, payload) => {
  const { render, store } = deps;
  const item = payload._event.detail.item;
  if (item?.value) {
    store.addFilterAssignee(item.value);
    store.closeDropdown();
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

export const handleLabelItemClick = (deps, payload) => {
  const { render, store } = deps;
  const item = payload._event.detail.item;
  if (item?.value) {
    store.addFilterLabel(item.value);
    store.closeDropdown();
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

export const handleStatusItemClick = (deps, payload) => {
  const { render, store } = deps;
  const item = payload._event.detail.item;
  if (item?.value) {
    store.addFilterStatus(item.value);
    store.closeDropdown();
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

export const handlePriorityItemClick = (deps, payload) => {
  const { render, store } = deps;
  const item = payload._event.detail.item;
  if (item?.value) {
    store.addFilterPriority(item.value);
    store.closeDropdown();
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

// Remove a specific filter chip
export const handleRemoveFilter = (deps, payload) => {
  const { render, store } = deps;
  const event = payload._event;
  const target = event.target.closest("[data-filter-type]");
  if (!target) return;

  const type = target.getAttribute("data-filter-type");
  const value = target.getAttribute("data-filter-value");

  if (type && value) {
    store.removeFilter({ type, value });
    render();
    syncStateToUrl(store.selectUrlState());
  }
};

export const handleClearAllFilters = (deps) => {
  const { render, store } = deps;
  store.clearAllFilters();
  render();
  syncStateToUrl(store.selectUrlState());
};
