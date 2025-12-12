import { createWebPatch } from "@rettangoli/fe";
import { h } from "snabbdom/build/h";
import { createTasksAggregateService } from "../deps/services/tasksAggregateService.js";
import { createDebouncer } from "../deps/services/debouncerService.js";

const pageDependencies = {
  taskAggregateService: createTasksAggregateService(),
  debounceUrlSync: createDebouncer(300),
};

const deps = {
  fe: pageDependencies,
};

const patch = createWebPatch();

export { h, patch, deps };
