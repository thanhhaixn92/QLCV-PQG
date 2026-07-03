import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";
import { registerTasksQueryRoutes } from "./tasksQueryRoutes";

export const tasksQueryManifest: AppModuleManifest = {
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
};

export const tasksQueryModule = {
  manifest: tasksQueryManifest,
  registerRoutes: registerTasksQueryRoutes
};
