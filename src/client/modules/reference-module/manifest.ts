import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const referenceModuleManifest: AppModuleManifest = {
  id: "reference-module",
  displayName: "Mô-đun Tham chiếu Chuẩn (Reference)",
  description: "Mô-đun mẫu thiết kế chuẩn, cung cấp các chuẩn mực lập trình và cấu trúc cho các mô-đun mới.",
  version: "1.0.0",
  routes: ["/reference-module"],
  requiredPermissions: ["reference.read", "reference.write"],
  dependencies: {
    required: [],
    optional: []
  },
  tools: ["referenceSampleTool"],
  capabilities: ["reference.execute"],
  migrations: [
    { version: "1.0.0", description: "Khởi tạo dữ liệu mẫu cho mô-đun tham chiếu" }
  ]
};

export default referenceModuleManifest;
