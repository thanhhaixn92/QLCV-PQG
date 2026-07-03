import { initFirebaseAdmin } from "../../infrastructure/firebase/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { serverConfig } from "../../app/serverConfig";
import { ModuleStateRepository, PersistedModuleState, SetModuleStateInput } from "./moduleStateTypes";
import { persistedModuleStateSchema } from "./moduleStateSchemas";
import { AppError } from "../../../shared/errors/appError";
import { logger } from "../../infrastructure/logging/logger";

export class FirestoreModuleStateRepository implements ModuleStateRepository {
  private getDb() {
    const app = initFirebaseAdmin();
    if (!app) {
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "Firebase Admin SDK chưa được khởi tạo. Không thể truy cập Firestore."
      );
    }
    return serverConfig.firebaseDatabaseId
      ? getFirestore(app, serverConfig.firebaseDatabaseId)
      : getFirestore(app);
  }

  private mapDocToRecord(docData: any): PersistedModuleState | null {
    try {
      const parseResult = persistedModuleStateSchema.safeParse(docData);
      if (!parseResult.success) {
        logger.warn(
          `FirestoreModuleStateRepository: Dữ liệu tài liệu '${docData?.moduleId}' không hợp lệ theo schema. Bỏ qua tài liệu này.`,
          parseResult.error.format()
        );
        return null;
      }

      const data = parseResult.data;
      let dateVal = new Date();
      if (data.updatedAt) {
        if (typeof data.updatedAt.toDate === "function") {
          dateVal = data.updatedAt.toDate();
        } else if (data.updatedAt instanceof Date) {
          dateVal = data.updatedAt;
        } else if (data.updatedAt._seconds !== undefined) {
          dateVal = new Date(data.updatedAt._seconds * 1000);
        } else {
          dateVal = new Date(data.updatedAt);
        }
      }

      return {
        moduleId: data.moduleId,
        state: data.state,
        version: data.version,
        updatedAt: dateVal,
        updatedBy: data.updatedBy,
        reason: data.reason,
      };
    } catch (e: any) {
      logger.error(`FirestoreModuleStateRepository: Lỗi khi map document sang record: ${e.message}`);
      return null;
    }
  }

  async get(moduleId: string): Promise<PersistedModuleState | null> {
    try {
      const db = this.getDb();
      const docRef = db.collection("system_module_states").doc(moduleId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return null;
      }
      return this.mapDocToRecord(snapshot.data());
    } catch (error: any) {
      logger.error(`FirestoreModuleStateRepository.get failed for module ${moduleId}: ${error.message}`);
      // Return null or safely ignore rather than crashing
      return null;
    }
  }

  async set(input: SetModuleStateInput): Promise<PersistedModuleState> {
    const db = this.getDb();
    const docRef = db.collection("system_module_states").doc(input.moduleId);

    try {
      const resultRecord = await db.runTransaction(async (transaction) => {
        const docSnapshot = await transaction.get(docRef);
        let currentVersion = 0;
        let existingData: any = null;

        if (docSnapshot.exists) {
          existingData = docSnapshot.data();
          currentVersion = typeof existingData?.version === "number" ? existingData.version : 0;
        }

        if (input.expectedVersion !== undefined && currentVersion !== input.expectedVersion) {
          throw new AppError(
            "DATA_CONFLICT",
            `Conflict: Phiên bản không khớp cho mô-đun '${input.moduleId}'. Phiên bản hiện tại là ${currentVersion}, mong đợi là ${input.expectedVersion}.`
          );
        }

        const nextVersion = currentVersion + 1;
        const nowTimestamp = Timestamp.now();

        const dataToSave = {
          moduleId: input.moduleId,
          state: input.state,
          version: nextVersion,
          updatedAt: nowTimestamp,
          updatedBy: input.updatedBy,
          reason: input.reason || "",
        };

        const parseResult = persistedModuleStateSchema.safeParse(dataToSave);
        if (!parseResult.success) {
          throw new AppError(
            "VALIDATION_FAILED",
            "Dữ liệu lưu trạng thái mô-đun không hợp lệ theo schema.",
            undefined,
            parseResult.error.format()
          );
        }

        transaction.set(docRef, dataToSave);

        return {
          moduleId: input.moduleId,
          state: input.state,
          version: nextVersion,
          updatedAt: nowTimestamp.toDate(),
          updatedBy: input.updatedBy,
          reason: input.reason,
        };
      });

      return resultRecord;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`FirestoreModuleStateRepository.set failed for module ${input.moduleId}: ${error.message}`);
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        `Không thể ghi trạng thái mô-đun xuống Firestore: ${error.message}`
      );
    }
  }

  async list(): Promise<PersistedModuleState[]> {
    try {
      const db = this.getDb();
      const querySnapshot = await db.collection("system_module_states").get();
      const records: PersistedModuleState[] = [];

      querySnapshot.forEach((doc) => {
        const record = this.mapDocToRecord(doc.data());
        if (record) {
          records.push(record);
        }
      });

      return records;
    } catch (error: any) {
      logger.error(`FirestoreModuleStateRepository.list failed: ${error.message}`);
      return [];
    }
  }
}
