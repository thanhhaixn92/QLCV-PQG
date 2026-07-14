import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const notificationsManifest: AppModuleManifest = {
  id: "notifications",
  displayName: "Mô-đun Thông báo & Cảnh báo",
  description: "Dịch vụ thông báo thời gian thực trong ứng dụng, tùy chọn gửi email nhắc nhở, và tự động quét công việc quá hạn.",
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
