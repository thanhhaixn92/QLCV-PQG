import { getFirebaseStatus, getConfiguredFirestore } from "../../../infrastructure/firebase/firebaseAdmin";
import { logger } from "../../../infrastructure/logging/logger";

interface AiUsageRecord {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalCharacters: number;
  lastActive: string;
}

let inMemoryMetrics: AiUsageRecord = {
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  totalCharacters: 0,
  lastActive: new Date().toISOString()
};

function isFirestoreReady(): boolean {
  const status = getFirebaseStatus();
  return status.status === "ready" || status.status === "initialized";
}

export const aiUsageTracker = {
  /**
   * Trả về chỉ số sử dụng AI
   */
  async getMetrics(): Promise<AiUsageRecord> {
    if (!isFirestoreReady()) {
      return inMemoryMetrics;
    }

    try {
      const db = getConfiguredFirestore();
      const doc = await db.collection("ai_usage_metrics").doc("global").get();
      if (doc.exists) {
        const dbData = doc.data() as AiUsageRecord;
        // Gộp chung cho an toàn
        inMemoryMetrics = {
          totalRequests: Math.max(inMemoryMetrics.totalRequests, dbData.totalRequests),
          successCount: Math.max(inMemoryMetrics.successCount, dbData.successCount),
          errorCount: Math.max(inMemoryMetrics.errorCount, dbData.errorCount),
          totalCharacters: Math.max(inMemoryMetrics.totalCharacters, dbData.totalCharacters),
          lastActive: dbData.lastActive || new Date().toISOString()
        };
      }
      return inMemoryMetrics;
    } catch (err) {
      return inMemoryMetrics;
    }
  },

  /**
   * Ghi nhận một cuộc hội thoại / truy vấn thành công
   */
  async recordSuccess(charCount: number): Promise<void> {
    inMemoryMetrics.totalRequests++;
    inMemoryMetrics.successCount++;
    inMemoryMetrics.totalCharacters += charCount;
    inMemoryMetrics.lastActive = new Date().toISOString();

    await this.persist();
  },

  /**
   * Ghi nhận một lỗi gọi mô hình
   */
  async recordError(): Promise<void> {
    inMemoryMetrics.totalRequests++;
    inMemoryMetrics.errorCount++;
    inMemoryMetrics.lastActive = new Date().toISOString();

    await this.persist();
  },

  /**
   * Lưu trữ bền vững lên Firestore
   */
  async persist(): Promise<void> {
    if (!isFirestoreReady()) return;

    try {
      const db = getConfiguredFirestore();
      await db.collection("ai_usage_metrics").doc("global").set(inMemoryMetrics);
    } catch (err: any) {
      logger.warn(`[AiUsageTracker] Không thể đồng bộ metrics lên Firestore: ${err.message}`);
    }
  }
};

export default aiUsageTracker;
