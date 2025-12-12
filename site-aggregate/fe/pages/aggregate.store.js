// URL sync functions
export const syncStateToUrl = (state) => {
  const params = new URLSearchParams();

  // Sort params
  if (state.sortBy !== "status") params.set("sort", state.sortBy);
  if (!state.sortAsc) params.set("order", "desc");

  // Filter params (arrays joined by comma)
  if (state.filterStatus.length > 0)
    params.set("status", state.filterStatus.join(","));
  if (state.filterPriority.length > 0)
    params.set("priority", state.filterPriority.join(","));
  if (state.filterWorkspace.length > 0)
    params.set("workspace", state.filterWorkspace.join(","));
  if (state.filterProject.length > 0)
    params.set("project", state.filterProject.join(","));
  if (state.filterAssignee.length > 0)
    params.set("assignee", state.filterAssignee.join(","));
  if (state.filterLabel.length > 0)
    params.set("label", state.filterLabel.join(","));

  // Text search
  if (state.searchQuery) params.set("q", state.searchQuery);

  const url = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", url);
};

// Helper to parse comma-separated param into array
const parseArrayParam = (param) => {
  if (!param) return [];
  return param.split(",").filter((v) => v.trim());
};

export const loadStateFromUrl = (state) => {
  const params = new URLSearchParams(window.location.search);

  // Sort params
  state.sortBy = params.get("sort") || "status";
  state.sortAsc = params.get("order") !== "desc";

  // Filter params (comma-separated to arrays)
  state.filterStatus = parseArrayParam(params.get("status"));
  state.filterPriority = parseArrayParam(params.get("priority"));
  state.filterWorkspace = parseArrayParam(params.get("workspace"));
  state.filterProject = parseArrayParam(params.get("project"));
  state.filterAssignee = parseArrayParam(params.get("assignee"));
  state.filterLabel = parseArrayParam(params.get("label"));

  // Text search
  state.searchQuery = params.get("q") || "";
};

const getSortFn = (sortBy) => {
  switch (sortBy) {
    case "status":
      return (a, b) => {
        const order = { todo: 0, done: 1 };
        const aStatus = (a.status || "").toLowerCase();
        const bStatus = (b.status || "").toLowerCase();
        return (order[aStatus] ?? 2) - (order[bStatus] ?? 2);
      };
    case "workspace":
      return (a, b) =>
        (a.workspaceName || "")
          .toLowerCase()
          .localeCompare((b.workspaceName || "").toLowerCase());
    case "priority":
      return (a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        const aPriority = (a.priority || "").toLowerCase();
        const bPriority = (b.priority || "").toLowerCase();
        return (order[aPriority] ?? 3) - (order[bPriority] ?? 3);
      };
    case "project":
      return (a, b) =>
        (a.projectName || "")
          .toLowerCase()
          .localeCompare((b.projectName || "").toLowerCase());
    case "id":
    default:
      return (a, b) => a.id.localeCompare(b.id);
  }
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const filterTasks = (tasks, state) => {
  return tasks.filter((task) => {
    // Filter by status (OR logic - match any selected status)
    if (state.filterStatus.length > 0) {
      const taskStatus = task.status || "";
      if (!state.filterStatus.includes(taskStatus)) return false;
    }
    // Filter by priority (OR logic)
    if (state.filterPriority.length > 0) {
      const taskPriority = task.priority || "";
      if (!state.filterPriority.includes(taskPriority)) return false;
    }
    // Filter by workspace (OR logic)
    if (state.filterWorkspace.length > 0) {
      const taskWorkspace = task.workspaceName || "";
      if (!state.filterWorkspace.includes(taskWorkspace)) return false;
    }
    // Filter by project (OR logic)
    if (state.filterProject.length > 0) {
      const taskProject = task.projectName || "";
      if (!state.filterProject.includes(taskProject)) return false;
    }
    // Filter by assignee (OR logic)
    if (state.filterAssignee.length > 0) {
      const taskAssignee = task.assignee || "";
      if (!state.filterAssignee.includes(taskAssignee)) return false;
    }
    // Filter by label (OR logic - task must have at least one matching label)
    if (state.filterLabel.length > 0) {
      const taskLabels = task.labels || [];
      if (!state.filterLabel.some((l) => taskLabels.includes(l))) return false;
    }
    // Text search (searchQuery is now pure text search)
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

export const createInitialState = () => ({
  searchQuery: "",
  sortBy: "status", // id, status, workspace, priority, project
  sortAsc: true,
  // Filter state (arrays for multi-select)
  filterStatus: [],
  filterPriority: [],
  filterWorkspace: [],
  filterProject: [],
  filterAssignee: [],
  filterLabel: [],
  // Dropdown menu state
  openDropdown: null, // which dropdown is open: 'workspace', 'project', etc.
  dropdownX: 0,
  dropdownY: 0,
  // Data
  config: null,
  tasks: [],
  lastUpdated: null,
  loading: true,
  error: null,
});

export const selectViewData = ({ state }) => {
  const filteredTasks = filterTasks(state.tasks, state);
  const sorted = [...filteredTasks].sort(getSortFn(state.sortBy));
  const sortedTasks = state.sortAsc ? sorted : sorted.reverse();

  // Build dynamic filter options from all tasks (not filtered)
  const workspaceSet = new Set();
  const projectSet = new Set();
  const assigneeSet = new Set();
  const labelSet = new Set();

  state.tasks.forEach((task) => {
    if (task.workspaceName) workspaceSet.add(task.workspaceName);
    if (task.projectName) projectSet.add(task.projectName);
    if (task.assignee) assigneeSet.add(task.assignee);
    (task.labels || []).forEach((l) => labelSet.add(l));
  });

  const toDropdownItems = (set) =>
    Array.from(set)
      .sort()
      .map((v) => ({ label: v, value: v, type: "item" }));

  // Add display labels and group separator flag
  const tasks = sortedTasks.map((task, index) => {
    const labels = task.labels || [];
    const displayLabels = labels.map((l) => {
      const truncated = l.length > 8 ? l.slice(0, 7) + "…" : l;
      return { name: l, display: `#${truncated}` };
    });

    // Detect if this task starts a new group based on current sort field
    let isNewGroup = false;
    let groupLabel = null;
    const getSortValue = (t) => {
      switch (state.sortBy) {
        case "status":
          return t.status || "";
        case "workspace":
          return t.workspaceName || "";
        case "project":
          return t.projectName || "";
        case "priority":
          return t.priority || "";
        default:
          return null;
      }
    };
    const currVal = getSortValue(task);

    if (index === 0) {
      // First task always shows group header (if sorting by a groupable field)
      if (currVal !== null) {
        isNewGroup = true;
        groupLabel = currVal;
      }
    } else {
      const prevTask = sortedTasks[index - 1];
      const prevVal = getSortValue(prevTask);
      if (currVal !== null && currVal !== prevVal) {
        isNewGroup = true;
        groupLabel = currVal;
      }
    }

    // Truncate workspace, project, assignee to 10 chars
    const truncate = (str, len) => {
      if (!str) return str;
      return str.length > len ? str.slice(0, len - 1) + "…" : str;
    };

    return {
      ...task,
      displayLabels,
      hasLabels: labels.length > 0,
      isNewGroup,
      groupLabel,
      displayWorkspace: truncate(task.workspaceName, 10),
      displayProject: truncate(task.projectName, 10),
      displayAssignee: truncate(task.assignee, 10),
    };
  });

  // Check if any filter is active
  const hasActiveFilters =
    state.filterStatus.length > 0 ||
    state.filterPriority.length > 0 ||
    state.filterWorkspace.length > 0 ||
    state.filterProject.length > 0 ||
    state.filterAssignee.length > 0 ||
    state.filterLabel.length > 0;

  // Build active filter chips for display
  const activeFilters = [
    ...state.filterStatus.map((v) => ({ type: "status", value: v })),
    ...state.filterPriority.map((v) => ({ type: "priority", value: v })),
    ...state.filterWorkspace.map((v) => ({ type: "workspace", value: v })),
    ...state.filterProject.map((v) => ({ type: "project", value: v })),
    ...state.filterAssignee.map((v) => ({ type: "assignee", value: v })),
    ...state.filterLabel.map((v) => ({ type: "label", value: v })),
  ];

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
    hasActiveFilters,
    activeFilters,
    // Dropdown menu state
    openDropdown: state.openDropdown,
    dropdownX: state.dropdownX,
    dropdownY: state.dropdownY,
    // Dropdown items for each filter type
    workspaceItems: toDropdownItems(workspaceSet),
    projectItems: toDropdownItems(projectSet),
    assigneeItems: toDropdownItems(assigneeSet),
    labelItems: toDropdownItems(labelSet),
    statusItems: [
      { label: "Todo", value: "todo", type: "item" },
      { label: "Done", value: "done", type: "item" },
    ],
    priorityItems: [
      { label: "High", value: "high", type: "item" },
      { label: "Medium", value: "medium", type: "item" },
      { label: "Low", value: "low", type: "item" },
    ],
  };
};

export const selectConfig = ({ state }) => {
  return state.config;
};

// Actions
export const setSearchQuery = (state, query) => {
  state.searchQuery = query;
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

export const setSortBy = (state, sortBy) => {
  state.sortBy = sortBy;
};

export const toggleSortOrder = (state) => {
  state.sortAsc = !state.sortAsc;
};

// Filter actions - add value to array if not present
export const addFilterStatus = (state, value) => {
  if (value && !state.filterStatus.includes(value)) {
    state.filterStatus.push(value);
  }
};

export const addFilterPriority = (state, value) => {
  if (value && !state.filterPriority.includes(value)) {
    state.filterPriority.push(value);
  }
};

export const addFilterWorkspace = (state, value) => {
  if (value && !state.filterWorkspace.includes(value)) {
    state.filterWorkspace.push(value);
  }
};

export const addFilterProject = (state, value) => {
  if (value && !state.filterProject.includes(value)) {
    state.filterProject.push(value);
  }
};

export const addFilterAssignee = (state, value) => {
  if (value && !state.filterAssignee.includes(value)) {
    state.filterAssignee.push(value);
  }
};

export const addFilterLabel = (state, value) => {
  if (value && !state.filterLabel.includes(value)) {
    state.filterLabel.push(value);
  }
};

// Remove specific filter value
export const removeFilter = (state, { type, value }) => {
  switch (type) {
    case "status":
      state.filterStatus = state.filterStatus.filter((v) => v !== value);
      break;
    case "priority":
      state.filterPriority = state.filterPriority.filter((v) => v !== value);
      break;
    case "workspace":
      state.filterWorkspace = state.filterWorkspace.filter((v) => v !== value);
      break;
    case "project":
      state.filterProject = state.filterProject.filter((v) => v !== value);
      break;
    case "assignee":
      state.filterAssignee = state.filterAssignee.filter((v) => v !== value);
      break;
    case "label":
      state.filterLabel = state.filterLabel.filter((v) => v !== value);
      break;
  }
};

export const clearAllFilters = (state) => {
  state.filterStatus = [];
  state.filterPriority = [];
  state.filterWorkspace = [];
  state.filterProject = [];
  state.filterAssignee = [];
  state.filterLabel = [];
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
