import { moduleRegistry } from "./moduleRegistry";
import { toolRegistry } from "../agent/toolRegistry";

export function registerAllModules() {
  moduleRegistry.registerModule({
    id: "tasks-query",
    displayName: "Truy vấn Công việc",
    description: "Mô-đun mẫu hỗ trợ tra cứu, tổng hợp, lọc và phân loại danh sách công việc.",
    routes: ["/tasks-query"],
    requiredPermissions: ["tasks.read"],
    dependencies: {
      required: [],
      optional: []
    },
    tools: ["queryTasksTool"]
  }, "disabled");

  // Register the corresponding mock tool in the ToolRegistry
  toolRegistry.registerTool({
    name: "queryTasksTool",
    moduleId: "tasks-query",
    risk: "read",
    requiredPermissions: ["tasks.read"],
    requiresApproval: false,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    async execute(input, context) {
      return { success: true, message: "Mock Tasks result", tasks: [] };
    }
  });
}

