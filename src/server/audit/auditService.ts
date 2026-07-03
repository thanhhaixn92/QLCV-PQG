import { AuditEvent } from "./auditTypes";
import { logger } from "../infrastructure/logging/logger";
import crypto from "crypto";

const inMemoryLogs: AuditEvent[] = [];

export const auditService = {
  logEvent(eventInput: Omit<AuditEvent, "id" | "timestamp">) {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...eventInput
    };

    inMemoryLogs.unshift(event);
    if (inMemoryLogs.length > 100) {
      inMemoryLogs.pop();
    }

    logger.info(`AUDIT: [${event.action}] by ${event.actor.type}:${event.actor.id || "unknown"} - Status: ${event.result}`, {
      auditEvent: event
    });
  },

  getRecentLogs(): readonly AuditEvent[] {
    return inMemoryLogs;
  }
};
