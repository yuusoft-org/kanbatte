import { createWebPatch } from "@rettangoli/fe";
import { h } from "snabbdom/build/h";
import { createTasksAggregateService } from "../deps/services/tasksAggregateService.js";

const pageDependencies = {
  taskAggregateService: createTasksAggregateService(),
};

const deps = {
  fe: pageDependencies,
};

const patch = createWebPatch();

export { h, patch, deps };
