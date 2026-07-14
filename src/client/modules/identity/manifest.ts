import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const identityModuleManifest: AppModuleManifest = {
  id: "identity-management",
  displayName: "Quản lý Danh tính & Phân quyền",
  description: "Mô-đun quản trị người dùng, vai trò hệ thống, và thiết lập phòng ban trực thuộc.",
  version: "1.0.0",
  routes: ["/identity-management"],
  requiredPermissions: ["modules.read"],
  dependencies: {
    required: [],
    optional: []
  },
  tools: [],
  capabilities: ["identity.manage"],
  migrations: [
    { version: "1.0.0", description: "Khởi tạo hệ thống phân quyền và bộ phận tổ chức ban đầu" }
  ]
};

export default identityModuleManifest;
