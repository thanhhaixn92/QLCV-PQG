import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const identityModuleManifest: AppModuleManifest = {
  id: "identity-management",
  displayName: "Quản lý Danh tính và Phân quyền",
  description: "Mô-đun quản trị người dùng, phòng ban trực thuộc, và phân quyền người dùng tập trung (RBAC).",
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
    { version: "1.0.0", description: "Khởi tạo hệ thống phòng ban và ánh xạ quyền hạn người dùng ban đầu" }
  ]
};

export default identityModuleManifest;
