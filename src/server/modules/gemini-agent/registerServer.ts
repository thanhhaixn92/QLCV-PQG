import { Router } from "express";
import { geminiAgentManifest } from "./manifest";
import { registerGeminiAgentRoutes } from "./routes/geminiAgentRoutes";
import { toolRegistry } from "../../agent/toolRegistry";
import { allAgentTools } from "./tools/tasksTools";

export const geminiAgentModule = {
  manifest: geminiAgentManifest,
  registerRoutes: (router: Router) => {
    // 1. Đăng ký các API routes của module
    registerGeminiAgentRoutes(router);

    // 2. Đăng ký các công cụ thực thi (tools) vào Tool Registry trung tâm
    for (const tool of allAgentTools) {
      toolRegistry.registerTool(tool);
    }
  }
};
