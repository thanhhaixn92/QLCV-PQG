import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const notificationsManifest: AppModuleManifest = {
  id: "notifications",
  displayName: "Mô-đun Thông báo & Cảnh báo",
  description: "Quản lý thông báo quá hạn, cảnh báo và dịch vụ gửi thư điện tử.",
  version: "1.0.0",
  routes: ["/notifications"],
  requiredPermissions: ["tasks.read"],
  dependencies: {
    required: ["tasks-query"],
    optional: []
  },
  tools: [],
  capabilities: ["notifications.send"],
  migrations: []
};

export default notificationsManifest;
