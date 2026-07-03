import { getFirebaseStatus } from "./firebaseAdmin";
import { logger } from "../logging/logger";

class SimulatedFirestore {
  private store: Record<string, Map<string, any>> = {};

  collection(name: string) {
    if (!this.store[name]) {
      this.store[name] = new Map();
    }
    const map = this.store[name];
    
    return {
      async get() {
        return Array.from(map.values());
      },
      async doc(id: string) {
        return {
          async get() {
            return map.get(id) || null;
          },
          async set(data: any) {
            map.set(id, { ...data, id, updatedAt: new Date().toISOString() });
            return true;
          },
          async delete() {
            map.delete(id);
            return true;
          }
        };
      },
      async add(data: any) {
        const id = Math.random().toString(36).substring(7);
        const record = { ...data, id, createdAt: new Date().toISOString() };
        map.set(id, record);
        return record;
      }
    };
  }
}

export const firestoreClient = {
  getFirestore() {
    const status = getFirebaseStatus();
    if (status.isMock) {
      logger.info("FirestoreClient: Sử dụng database giả lập do chưa cấu hình Firestore.");
    } else {
      logger.info(`FirestoreClient: Đã cấu hình Firebase. Database ID: ${status.databaseId}`);
    }
    return new SimulatedFirestore();
  }
};
export const dbClient = firestoreClient.getFirestore();
