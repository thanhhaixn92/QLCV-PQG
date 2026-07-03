import { moduleRegistry } from "./moduleRegistry";
import { toolRegistry } from "../agent/toolRegistry";
import { tasksQueryModule } from "./tasks-query/tasksQueryModule";
import { tasksCommandModule } from "./tasks-command/register";

export function registerAllModules() {
  // Clear any existing registrations first for safe hot-reload/test initialization
  moduleRegistry.clear();
  toolRegistry.clear();

  moduleRegistry.registerModule(
    tasksQueryModule.manifest,
    "disabled",
    tasksQueryModule.registerRoutes
  );

  moduleRegistry.registerModule(
    tasksCommandModule.manifest,
    "disabled",
    tasksCommandModule.registerRoutes
  );

  // Perform post-registration validation on the dependency graph
  moduleRegistry.validateDependencies();
}

