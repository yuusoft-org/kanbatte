import { createWebPatch } from "@rettangoli/fe";
import { h } from "snabbdom/build/h";
import { createTasksAggregateService } from "../deps/services/tasksAggregateService.js";
import { createUrlStateService } from "../deps/services/urlStateService.js";

const pageDependencies = {
  taskAggregateService: createTasksAggregateService(),
  urlStateService: createUrlStateService(),
};

const deps = {
  fe: pageDependencies,
};

const patch = createWebPatch();

export { h, patch, deps };
