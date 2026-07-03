import { moduleRegistry } from "./moduleRegistry";
import { toolRegistry } from "../agent/toolRegistry";

export function registerAllModules() {
  // Clear any existing registrations first for safe hot-reload/test initialization
  moduleRegistry.clear();
  toolRegistry.clear();

  moduleRegistry.registerModule({
    id: "tasks-query",
    displayName: "Truy vấn Công việc",
    description: "Mô-đun mẫu hỗ trợ tra cứu, tổng hợp, lọc và phân loại danh sách công việc.",
    routes: ["/tasks-query"],
    requiredPermissions: ["tasks.read"],
    dependencies: {
      required: [],
      optional: []
    },
    tools: []
  }, "disabled");

  // Perform post-registration validation on the dependency graph
  moduleRegistry.validateDependencies();
}

