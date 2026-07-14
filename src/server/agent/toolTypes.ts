import { ToolExecutionContext } from "./agentTypes";

export type ToolRisk = "read" | "write" | "sensitive" | "destructive";

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  moduleId: string;
  risk: ToolRisk;
  requiredPermissions: readonly string[];
  requiresApproval: boolean;
  inputSchema: unknown;
  outputSchema: unknown;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}
