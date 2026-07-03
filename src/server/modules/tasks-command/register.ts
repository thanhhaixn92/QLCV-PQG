import { tasksCommandManifest } from "./manifest";
import { registerTaskCommandRoutes } from "./routes/taskCommandRoutes";

export const tasksCommandModule = {
  manifest: tasksCommandManifest,
  registerRoutes: registerTaskCommandRoutes
};
