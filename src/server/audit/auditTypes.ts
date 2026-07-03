export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: {
    type: "user" | "system" | "agent";
    id?: string;
  };
  action: string;
  moduleId?: string;
  targetType?: string;
  targetId?: string;
  requestId: string;
  result: "success" | "denied" | "failed";
  reason?: string;
  metadata?: Record<string, any>;
}
