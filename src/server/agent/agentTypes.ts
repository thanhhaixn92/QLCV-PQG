export interface ToolExecutionContext {
  userId?: string;
  requestId: string;
  permissions: readonly string[];
}
