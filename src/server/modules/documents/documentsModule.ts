import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";
import { registerDocumentsRoutes } from "./documentsRoutes";

export const documentsManifest: AppModuleManifest = {
  id: "documents",
  displayName: "Tài liệu & Biên tập",
  description: "Quản lý tài liệu, phiên bản tài liệu và phân cấp thư mục.",
  version: "1.0.0",
  routes: ["/documents"],
  requiredPermissions: ["documents.read"],
  dependencies: {
    required: ["identity"],
    optional: ["tasks-query"]
  },
  tools: [],
  capabilities: ["documents.read", "documents.create", "documents.update", "documents.delete"],
  migrations: []
};

export const documentsModule = {
  manifest: documentsManifest,
  registerRoutes: registerDocumentsRoutes
};
export default documentsModule;
