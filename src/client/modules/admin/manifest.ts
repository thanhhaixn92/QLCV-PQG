import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const adminManifest: AppModuleManifest = {
  id: "admin-panel",
  displayName: "Bảng Điều khiển Quản trị",
  description: "Quản lý người dùng, vai trò, theo dõi lưu lượng AI tiêu thụ, và cấu hình bật/tắt mô-đun động.",
  version: "1.0.0",
  routes: ["/admin-panel"],
  requiredPermissions: ["modules.read", "modules.manage"],
  dependencies: {
    required: [],
    optional: []
  },
  tools: [],
  capabilities: ["admin.manage"],
  migrations: []
};

export default adminManifest;
