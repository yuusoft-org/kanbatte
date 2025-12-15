const FILTER_TYPES = ["status", "priority", "workspace", "project", "assignee", "label"];

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const getFilterKey = (type) => `filter${capitalize(type)}`;

const parseArrayParam = (param) => {
  if (!param) return [];
  return param.split(",").filter((v) => v.trim());
};

const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const createUrlStateService = () => {
  const writeStateToUrl = (state) => {
    const params = new URLSearchParams();

    if (state.sortBy !== "status") params.set("sort", state.sortBy);
    if (!state.sortAsc) params.set("order", "desc");

    FILTER_TYPES.forEach((type) => {
      const values = state[getFilterKey(type)];
      if (values.length > 0) params.set(type, values.join(","));
    });

    if (state.searchQuery) params.set("q", state.searchQuery);

    const url = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", url);
  };

  const readStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);

    const filterState = {};
    FILTER_TYPES.forEach((type) => {
      filterState[getFilterKey(type)] = parseArrayParam(params.get(type));
    });

    return {
      sortBy: params.get("sort") || "status",
      sortAsc: params.get("order") !== "desc",
      ...filterState,
      searchQuery: params.get("q") || "",
    };
  };

  return {
    syncStateToUrl: debounce(writeStateToUrl, 300),
    loadStateFromUrl: readStateFromUrl,
  };
};
