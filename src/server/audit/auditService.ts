import { AuditEvent } from "./auditTypes";
import { logger } from "../infrastructure/logging/logger";
import { getFirebaseStatus, getConfiguredFirestore } from "../infrastructure/firebase/firebaseAdmin";
import crypto from "crypto";

const inMemoryLogs: AuditEvent[] = [];

function isFirestoreReady(): boolean {
  const status = getFirebaseStatus();
  return status.status === "ready" || status.status === "initialized";
}

export const auditService = {
  /**
   * Ghi nhận sự kiện kiểm toán bền vững.
   * Chạy bất đồng bộ không gây nghẽn (non-blocking) luồng chính.
   */
  logEvent(eventInput: Omit<AuditEvent, "id" | "timestamp">) {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...eventInput
    };

    // 1. Lưu vào hàng đợi in-memory để truy xuất nhanh và fallback
    inMemoryLogs.unshift(event);
    if (inMemoryLogs.length > 100) {
      inMemoryLogs.pop();
    }

    // 2. Ghi nhật ký ra console / file log tập trung
    logger.info(`AUDIT: [${event.action}] by ${event.actor.type}:${event.actor.id || "unknown"} - Status: ${event.result}`, {
      auditEvent: event
    });

    // 3. Ghi vào Firestore bền vững nếu khả dụng
    if (isFirestoreReady()) {
      (async () => {
        try {
          const db = getConfiguredFirestore();
          await db.collection("audit_logs").doc(event.id).set(event);
        } catch (dbErr: any) {
          logger.warn(`[AuditService] Thất bại khi ghi lưu trữ Audit Log lên Firestore: ${dbErr.message}. Fallback sang lưu trữ in-memory.`);
        }
      })();
    }
  },

  /**
   * Trả về cache logs tạm thời in-memory
   */
  getRecentLogs(): readonly AuditEvent[] {
    return inMemoryLogs;
  },

  /**
   * Truy vấn nhật ký kiểm toán trực tiếp từ cơ sở dữ liệu Firestore
   */
  async getRecentLogsFromDb(limitCount: number = 50): Promise<AuditEvent[]> {
    if (!isFirestoreReady()) {
      logger.info("[AuditService] Firestore chưa được cấu hình. Trả về nhật ký kiểm toán in-memory fallback.");
      return inMemoryLogs.slice(0, limitCount);
    }

    try {
      const db = getConfiguredFirestore();
      const snapshot = await db.collection("audit_logs")
        .orderBy("timestamp", "desc")
        .limit(limitCount)
        .get();

      if (snapshot.empty) {
        return inMemoryLogs.slice(0, limitCount);
      }

      const logs: AuditEvent[] = [];
      snapshot.forEach(doc => {
        logs.push(doc.data() as AuditEvent);
      });
      return logs;
    } catch (error: any) {
      logger.warn(`[AuditService] Không thể truy vấn audit_logs từ Firestore: ${error.message}. Trả về in-memory fallback.`);
      return inMemoryLogs.slice(0, limitCount);
    }
  },

  async getLogsByTargetId(targetId: string, limitCount: number = 20): Promise<AuditEvent[]> {
    if (!isFirestoreReady()) {
      return inMemoryLogs.filter(log => log.targetId === targetId).slice(0, limitCount);
    }

    try {
      const db = getConfiguredFirestore();
      const snapshot = await db.collection("audit_logs")
        .where("targetId", "==", targetId)
        .orderBy("timestamp", "desc")
        .limit(limitCount)
        .get();

      if (snapshot.empty) {
        return inMemoryLogs.filter(log => log.targetId === targetId).slice(0, limitCount);
      }

      const logs: AuditEvent[] = [];
      snapshot.forEach(doc => {
        logs.push(doc.data() as AuditEvent);
      });
      return logs;
    } catch (error: any) {
      logger.warn(`[AuditService] Không thể truy vấn audit_logs từ Firestore cho targetId ${targetId}: ${error.message}. Trả về in-memory fallback.`);
      return inMemoryLogs.filter(log => log.targetId === targetId).slice(0, limitCount);
    }
  }
};

export default auditService;
