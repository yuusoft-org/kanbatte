export const FILTER_TYPES = ["status", "priority", "workspace", "project", "assignee", "label"];
const SIMPLE_FILTERS = ["status", "priority", "workspace", "project", "assignee"];
const GROUPABLE_SORTS = ["status", "workspace", "project", "priority"];

export const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const getFilterKey = (type) => `filter${capitalize(type)}`;

const truncate = (str, len) => {
  if (!str) return str;
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export const createInitialState = () => {
  const filterState = {};
  FILTER_TYPES.forEach((type) => {
    filterState[getFilterKey(type)] = [];
  });

  return {
    searchQuery: "",
    sortBy: "status",
    sortAsc: true,
    ...filterState,
    openDropdown: null,
    dropdownX: 0,
    dropdownY: 0,
    config: null,
    tasks: [],
    lastUpdated: null,
    loading: true,
    error: null,
  };
};

const getSortFn = (sortBy) => {
  switch (sortBy) {
    case "status":
      return (a, b) => {
        const order = { Todo: 0, Done: 1 };
        return (order[a.status] ?? 2) - (order[b.status] ?? 2);
      };
    case "priority":
      return (a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      };
    case "workspace":
      return (a, b) => (a.workspace || "").localeCompare(b.workspace || "");
    case "project":
      return (a, b) => (a.project || "").localeCompare(b.project || "");
    case "id":
    default:
      return (a, b) => a.id.localeCompare(b.id);
  }
};

const filterTasks = (tasks, state) => {
  return tasks.filter((task) => {
    const failsSimpleFilter = SIMPLE_FILTERS.some((type) => {
      const filterValues = state[getFilterKey(type)];
      if (filterValues.length === 0) return false;
      const taskValue = task[type] || "";
      return !filterValues.includes(taskValue);
    });
    if (failsSimpleFilter) return false;

    if (state.filterLabel.length > 0) {
      const taskLabels = task.labels || [];
      if (!state.filterLabel.some((l) => taskLabels.includes(l))) return false;
    }

    if (state.searchQuery.trim()) {
      const searchLower = state.searchQuery.toLowerCase();
      const titleLower = task.title?.toLowerCase() || "";
      const idLower = task.id?.toLowerCase() || "";
      if (!titleLower.includes(searchLower) && !idLower.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
};

const getGroupValue = (task, sortBy) => {
  if (!GROUPABLE_SORTS.includes(sortBy)) return null;
  return task[sortBy] || "";
};

const toDropdownItems = (set) =>
  Array.from(set)
    .sort()
    .map((v) => ({ label: v, value: v, type: "item" }));

const buildDropdownOptions = (tasks) => {
  const workspaceSet = new Set();
  const projectSet = new Set();
  const assigneeSet = new Set();
  const labelSet = new Set();

  tasks.forEach((task) => {
    if (task.workspace) workspaceSet.add(task.workspace);
    if (task.project) projectSet.add(task.project);
    if (task.assignee) assigneeSet.add(task.assignee);
    (task.labels || []).forEach((l) => labelSet.add(l));
  });

  return {
    workspaceItems: toDropdownItems(workspaceSet),
    projectItems: toDropdownItems(projectSet),
    assigneeItems: toDropdownItems(assigneeSet),
    labelItems: toDropdownItems(labelSet),
    statusItems: [
      { label: "Todo", value: "Todo", type: "item" },
      { label: "Done", value: "Done", type: "item" },
    ],
    priorityItems: [
      { label: "High", value: "High", type: "item" },
      { label: "Medium", value: "Medium", type: "item" },
      { label: "Low", value: "Low", type: "item" },
    ],
  };
};

const buildActiveFilters = (state) =>
  FILTER_TYPES.flatMap((type) =>
    state[getFilterKey(type)].map((v) => ({ type, value: v })),
  );

const hasActiveFilters = (state) =>
  FILTER_TYPES.some((type) => state[getFilterKey(type)].length > 0);

const mapTaskForDisplay = (task, index, sortedTasks, sortBy) => {
  const labels = task.labels || [];
  const displayLabels = labels.map((l) => ({
    name: l,
    display: `#${truncate(l, 8)}`,
  }));

  const currVal = getGroupValue(task, sortBy);
  const prevVal = index > 0 ? getGroupValue(sortedTasks[index - 1], sortBy) : null;
  const isNewGroup = currVal !== null && (index === 0 || currVal !== prevVal);

  return {
    ...task,
    displayLabels,
    hasLabels: labels.length > 0,
    isNewGroup,
    groupLabel: isNewGroup ? currVal : null,
    displayWorkspace: truncate(task.workspace, 10),
    displayProject: truncate(task.project, 10),
    displayAssignee: truncate(task.assignee, 10),
  };
};

export const selectViewData = ({ state }) => {
  const filteredTasks = filterTasks(state.tasks, state);
  const sorted = [...filteredTasks].sort(getSortFn(state.sortBy));
  const sortedTasks = state.sortAsc ? sorted : sorted.reverse();
  const tasks = sortedTasks.map((task, index) =>
    mapTaskForDisplay(task, index, sortedTasks, state.sortBy),
  );

  return {
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    sortAsc: state.sortAsc,
    tasks,
    lastUpdated: state.lastUpdated ? formatTimeAgo(state.lastUpdated) : "Never",
    loading: state.loading,
    error: state.error,
    taskCount: tasks.length,
    totalCount: state.tasks.length,
    hasActiveFilters: hasActiveFilters(state),
    activeFilters: buildActiveFilters(state),
    openDropdown: state.openDropdown,
    dropdownX: state.dropdownX,
    dropdownY: state.dropdownY,
    ...buildDropdownOptions(state.tasks),
  };
};

export const selectConfig = ({ state }) => state.config;

export const selectUrlState = ({ state }) => {
  const filterState = {};
  FILTER_TYPES.forEach((type) => {
    filterState[getFilterKey(type)] = state[getFilterKey(type)];
  });
  return {
    sortBy: state.sortBy,
    sortAsc: state.sortAsc,
    ...filterState,
    searchQuery: state.searchQuery,
  };
};

export const setConfig = (state, config) => {
  state.config = config;
};

export const setTasks = (state, tasks) => {
  state.tasks = tasks;
  state.lastUpdated = new Date();
  state.loading = false;
  state.error = null;
};

export const setLoading = (state, loading) => {
  state.loading = loading;
};

export const setError = (state, error) => {
  state.error = error;
  state.loading = false;
};

export const setSearchQuery = (state, query) => {
  state.searchQuery = query;
};

export const setSortBy = (state, sortBy) => {
  state.sortBy = sortBy;
};

export const toggleSortOrder = (state) => {
  state.sortAsc = !state.sortAsc;
};

const addFilter = (state, type, value) => {
  const key = getFilterKey(type);
  if (value && !state[key].includes(value)) {
    state[key].push(value);
  }
};

export const addFilterStatus = (state, value) => addFilter(state, "status", value);
export const addFilterPriority = (state, value) => addFilter(state, "priority", value);
export const addFilterWorkspace = (state, value) => addFilter(state, "workspace", value);
export const addFilterProject = (state, value) => addFilter(state, "project", value);
export const addFilterAssignee = (state, value) => addFilter(state, "assignee", value);
export const addFilterLabel = (state, value) => addFilter(state, "label", value);

export const removeFilter = (state, { type, value }) => {
  const key = getFilterKey(type);
  state[key] = state[key].filter((v) => v !== value);
};

export const clearAllFilters = (state) => {
  FILTER_TYPES.forEach((type) => {
    state[getFilterKey(type)] = [];
  });
  state.searchQuery = "";
};

export const openDropdown = (state, { type, x, y }) => {
  state.openDropdown = type;
  state.dropdownX = x;
  state.dropdownY = y;
};

export const closeDropdown = (state) => {
  state.openDropdown = null;
};

export const applyUrlState = (state, urlState) => {
  state.sortBy = urlState.sortBy;
  state.sortAsc = urlState.sortAsc;
  state.searchQuery = urlState.searchQuery;
  FILTER_TYPES.forEach((type) => {
    state[getFilterKey(type)] = urlState[getFilterKey(type)];
  });
};
