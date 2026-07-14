import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const tasksQueryManifest: AppModuleManifest = {
  id: "tasks-query",
  displayName: "Truy vấn Công việc",
  description: "Mô-đun mẫu hỗ trợ tra cứu, tổng hợp, lọc và phân loại danh sách công việc.",
  version: "1.0.0",
  routes: ["/tasks-query"],
  requiredPermissions: ["tasks.read"],
  dependencies: {
    required: [],
    optional: []
  },
  tools: ["queryTasksTool"],
  capabilities: ["tasks.read"],
  migrations: [
    { version: "1.0.0", description: "Initialize tasks index on query-side" }
  ]
};
export default tasksQueryManifest;
