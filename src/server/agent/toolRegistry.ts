import { AgentTool } from "./toolTypes";
import { moduleStateService } from "../modules/moduleStateService";
import { logger } from "../infrastructure/logging/logger";

class ToolRegistryClass {
  private tools = new Map<string, AgentTool>();

  registerTool(tool: AgentTool): boolean {
    if (this.tools.has(tool.name)) {
      logger.error(`ToolRegistry: Trùng lặp tên tool đăng ký: ${tool.name}`);
      return false;
    }
    this.tools.set(tool.name, tool);
    logger.info(`ToolRegistry: Đăng ký thành công tool '${tool.name}' của mô-đun '${tool.moduleId}'`);
    return true;
  }

  getToolsForUser(userPermissions: readonly string[]): AgentTool[] {
    const activeTools: AgentTool[] = [];

    for (const tool of this.tools.values()) {
      if (!moduleStateService.isModuleEnabled(tool.moduleId)) {
        continue;
      }

      const hasPermissions = tool.requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasPermissions) {
        continue;
      }

      activeTools.push(tool);
    }

    return activeTools;
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }
}

export const toolRegistry = new ToolRegistryClass();
