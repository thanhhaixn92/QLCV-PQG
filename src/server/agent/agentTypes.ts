export interface ToolExecutionContext {
  userId?: string;
  userRole?: string;
  requestId: string;
  permissions: readonly string[];
  departments?: readonly string[];
}
