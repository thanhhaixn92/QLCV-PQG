import { AppModuleManifest } from "../../../shared/contracts/moduleContracts";

export const geminiAgentManifest: AppModuleManifest = {
  id: "gemini-agent",
  displayName: "Trợ lý Gemini Agent",
  description: "Trợ lý AI đa tác vụ, tự động lập kế hoạch và thực thi công cụ trong phạm vi quyền hạn.",
  version: "1.0.0",
  routes: ["/gemini-agent"],
  requiredPermissions: ["agent.use"],
  dependencies: {
    required: ["tasks-query", "tasks-command"],
    optional: []
  },
  tools: ["list_tasks", "get_task", "create_task", "update_task"],
  capabilities: ["agent.use"],
  migrations: [
    { version: "1.0.0", description: "Initialize Gemini Agent Module" }
  ]
};
