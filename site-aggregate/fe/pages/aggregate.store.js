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

const parseSearchQuery = (query) => {
  const filters = {
    workspace: null,
    project: null,
    priority: null,
    status: null,
    assignee: null,
    label: null,
    text: [],
  };

  const parts = query.trim().split(/\s+/);
  for (const part of parts) {
    if (part.startsWith("workspace:")) {
      filters.workspace = part.slice(10).toLowerCase();
    } else if (part.startsWith("project:")) {
      filters.project = part.slice(8).toLowerCase();
    } else if (part.startsWith("priority:")) {
      filters.priority = part.slice(9).toLowerCase();
    } else if (part.startsWith("status:")) {
      filters.status = part.slice(7).toLowerCase();
    } else if (part.startsWith("assignee:")) {
      filters.assignee = part.slice(9).toLowerCase();
    } else if (part.startsWith("label:")) {
      filters.label = part.slice(6).toLowerCase();
    } else if (part) {
      filters.text.push(part.toLowerCase());
    }
  }

  return filters;
};

const filterTasks = (tasks, query) => {
  if (!query.trim()) return tasks;

  const filters = parseSearchQuery(query);

  return tasks.filter((task) => {
    if (
      filters.workspace &&
      task.workspaceName?.toLowerCase() !== filters.workspace
    ) {
      return false;
    }
    if (
      filters.project &&
      task.projectName?.toLowerCase() !== filters.project
    ) {
      return false;
    }
    if (filters.priority && task.priority?.toLowerCase() !== filters.priority) {
      return false;
    }
    if (filters.status && task.status?.toLowerCase() !== filters.status) {
      return false;
    }
    if (filters.assignee && task.assignee?.toLowerCase() !== filters.assignee) {
      return false;
    }
    if (filters.label) {
      const labels = task.labels || [];
      const hasLabel = labels.some((l) => l?.toLowerCase() === filters.label);
      if (!hasLabel) return false;
    }
    if (filters.text.length > 0) {
      const titleLower = task.title?.toLowerCase() || "";
      const idLower = task.id?.toLowerCase() || "";
      return filters.text.every(
        (t) => titleLower.includes(t) || idLower.includes(t),
      );
    }
    return true;
  });
};

export const createInitialState = () => ({
  searchQuery: "",
  sortBy: "status", // id, status, workspace, priority, project
  sortAsc: true,
  config: null,
  tasks: [],
  lastUpdated: null,
  loading: true,
  error: null,
});

export const selectViewData = ({ state }) => {
  const filteredTasks = filterTasks(state.tasks, state.searchQuery);
  const sorted = [...filteredTasks].sort(getSortFn(state.sortBy));
  const sortedTasks = state.sortAsc ? sorted : sorted.reverse();

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
