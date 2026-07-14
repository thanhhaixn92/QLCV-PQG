import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const reportingManifest: AppModuleManifest = {
  id: "reporting",
  displayName: "Mô-đun Báo cáo & Thống kê",
  description: "Báo cáo thống kê hiệu suất công việc theo trạng thái, phòng ban, cá nhân và xuất dữ liệu sang Excel/PDF.",
  version: "1.0.0",
  routes: ["/reporting"],
  requiredPermissions: ["tasks.read"],
  dependencies: {
    required: ["tasks-query"],
    optional: []
  },
  tools: [],
  capabilities: ["reporting.generate"],
  migrations: []
};

export default reportingManifest;
