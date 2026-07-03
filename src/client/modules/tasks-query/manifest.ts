import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

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
  tools: ["queryTasksTool"]
};
export default tasksQueryManifest;
