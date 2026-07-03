import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const tasksCommandManifest: AppModuleManifest = {
  id: "tasks-command",
  displayName: "Ghi nhận Công việc (Commands)",
  description: "Mô-đun hỗ trợ thêm, sửa, phân công, chuyển trạng thái và lưu trữ công việc.",
  routes: ["/tasks-command"],
  requiredPermissions: [
    "tasks.create",
    "tasks.update",
    "tasks.assign",
    "tasks.transition",
    "tasks.archive",
    "tasks.manage"
  ],
  dependencies: {
    required: ["tasks-query"],
    optional: []
  },
  tools: []
};

export default tasksCommandManifest;
