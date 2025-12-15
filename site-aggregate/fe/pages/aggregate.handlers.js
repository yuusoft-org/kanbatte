import { FILTER_TYPES } from "./aggregate.store.js";

const addFilterByType = (store, type, value) => {
  const actions = {
    status: store.addFilterStatus,
    priority: store.addFilterPriority,
    workspace: store.addFilterWorkspace,
    project: store.addFilterProject,
    assignee: store.addFilterAssignee,
    label: store.addFilterLabel,
  };
  const action = actions[type];
  if (action) action(value);
};

export const handleAfterMount = async (deps) => {
  const { render, store, taskAggregateService, urlStateService } = deps;

  const urlState = urlStateService.loadStateFromUrl();
  store.applyUrlState(urlState);
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

export const handleSearchInput = (deps, payload) => {
  const { render, store, urlStateService } = deps;
  const { value } = payload._event.detail;
  store.setSearchQuery(value);
  render();
  urlStateService.syncStateToUrl(store.selectUrlState());
};

export const handleSearchKeydown = (deps, payload) => {
  const { render, store, urlStateService } = deps;
  const event = payload._event;
  if (event.key === "Escape") {
    store.setSearchQuery("");
    render();
    urlStateService.syncStateToUrl(store.selectUrlState());
  }
};

export const handleClearSearch = (deps) => {
  const { render, store, urlStateService } = deps;
  store.setSearchQuery("");
  render();
  urlStateService.syncStateToUrl(store.selectUrlState());
};

const createSortHandler = (sortBy) => (deps) => {
  const { render, store, urlStateService } = deps;
  store.setSortBy(sortBy);
  render();
  urlStateService.syncStateToUrl(store.selectUrlState());
};

export const handleSortById = createSortHandler("id");
export const handleSortByStatus = createSortHandler("status");
export const handleSortByWorkspace = createSortHandler("workspace");
export const handleSortByPriority = createSortHandler("priority");
export const handleSortByProject = createSortHandler("project");

export const handleToggleOrder = (deps) => {
  const { render, store, urlStateService } = deps;
  store.toggleSortOrder();
  render();
  urlStateService.syncStateToUrl(store.selectUrlState());
};

export const handleTaskListClick = (deps, payload) => {
  const { render, store, urlStateService } = deps;
  const event = payload._event;
  const filterEl = event.target.closest("[data-filter]");
  if (!filterEl) return;

  const value = filterEl.getAttribute("data-value");
  const filterType = filterEl.getAttribute("data-filter");

  if (filterType && value && FILTER_TYPES.includes(filterType)) {
    event.preventDefault();
    event.stopPropagation();
    addFilterByType(store, filterType, value);
    render();
    urlStateService.syncStateToUrl(store.selectUrlState());
  }
};

export const handleRemoveFilter = (deps, payload) => {
  const { render, store, urlStateService } = deps;
  const event = payload._event;
  const target = event.target.closest("[data-filter-type]");
  if (!target) return;

  const type = target.getAttribute("data-filter-type");
  const value = target.getAttribute("data-filter-value");

  if (type && value) {
    store.removeFilter({ type, value });
    render();
    urlStateService.syncStateToUrl(store.selectUrlState());
  }
};

export const handleClearAllFilters = (deps) => {
  const { render, store, urlStateService } = deps;
  store.clearAllFilters();
  render();
  urlStateService.syncStateToUrl(store.selectUrlState());
};

const createOpenDropdownHandler = (type) => (deps, payload) => {
  const { render, store } = deps;
  const rect = payload._event.target.getBoundingClientRect();
  store.openDropdown({ type, x: rect.left, y: rect.bottom });
  render();
};

export const handleOpenWorkspaceDropdown = createOpenDropdownHandler("workspace");
export const handleOpenProjectDropdown = createOpenDropdownHandler("project");
export const handleOpenAssigneeDropdown = createOpenDropdownHandler("assignee");
export const handleOpenLabelDropdown = createOpenDropdownHandler("label");
export const handleOpenStatusDropdown = createOpenDropdownHandler("status");
export const handleOpenPriorityDropdown = createOpenDropdownHandler("priority");

export const handleCloseDropdown = (deps) => {
  const { render, store } = deps;
  store.closeDropdown();
  render();
};

const createFilterItemHandler = (type) => (deps, payload) => {
  const { render, store, urlStateService } = deps;
  const { item } = payload._event.detail;
  if (item?.value) {
    addFilterByType(store, type, item.value);
    store.closeDropdown();
    render();
    urlStateService.syncStateToUrl(store.selectUrlState());
  }
};

export const handleWorkspaceItemClick = createFilterItemHandler("workspace");
export const handleProjectItemClick = createFilterItemHandler("project");
export const handleAssigneeItemClick = createFilterItemHandler("assignee");
export const handleLabelItemClick = createFilterItemHandler("label");
export const handleStatusItemClick = createFilterItemHandler("status");
export const handlePriorityItemClick = createFilterItemHandler("priority");
