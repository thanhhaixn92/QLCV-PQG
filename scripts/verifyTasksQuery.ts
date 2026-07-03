import dotenv from "dotenv";
dotenv.config();

import { getConfiguredFirestore } from "../src/server/infrastructure/firebase/firebaseAdmin";
import { taskDocumentMapper } from "../src/server/modules/tasks-query/data/taskDocumentMapper";
import { serverConfig } from "../src/server/app/serverConfig";

async function main() {
  const firebaseDatabaseId = process.env.FIREBASE_DATABASE_ID;
  const tasksCollection = process.env.TASKS_COLLECTION;
  const tsMode = process.env.TASKS_TIMESTAMP_MODE || "firestore";

  if (!tasksCollection || !tasksCollection.trim()) {
    console.error("Lỗi: Thiếu cấu hình TASKS_COLLECTION.");
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === "production" || serverConfig.nodeEnv === "production";
  if (isProduction && (!firebaseDatabaseId || !firebaseDatabaseId.trim())) {
    console.error("Lỗi: Thiếu cấu hình FIREBASE_DATABASE_ID.");
    process.exit(1);
  }

  const dbId = (firebaseDatabaseId && firebaseDatabaseId.trim()) ? firebaseDatabaseId.trim() : "(default)";
  const dedupKey = process.env.SEED_TASK_DEDUP_KEY || "initial-test-task";

  try {
    const db = getConfiguredFirestore();
    const querySnapshot = await db
      .collection(tasksCollection.trim())
      .where("seedKey", "==", dedupKey)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.error(`Lỗi: Không tìm thấy document seed có seedKey là '${dedupKey}' trong collection '${tasksCollection}'.`);
      process.exit(1);
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    // Run mapper
    const mapped = taskDocumentMapper.map(doc.id, data, "firestore");
    if (!mapped) {
      console.error("Lỗi: Mapper trả về null đối với document seed.");
      process.exit(1);
    }

    // Verify fields
    if (!mapped.title || mapped.title !== data.title) {
      console.error("Lỗi: Tiêu đề không khớp hoặc không hợp lệ.");
      process.exit(1);
    }

    // Verify timestamp strings
    const checkISOString = (val: string | null): boolean => {
      if (!val) return false;
      const d = new Date(val);
      return !isNaN(d.getTime()) && val.includes("T") && val.endsWith("Z");
    };

    if (!checkISOString(mapped.createdAt)) {
      console.error(`Lỗi: createdAt không phải chuỗi ISO 8601 hợp lệ: ${mapped.createdAt}`);
      process.exit(1);
    }

    if (!checkISOString(mapped.updatedAt)) {
      console.error(`Lỗi: updatedAt không phải chuỗi ISO 8601 hợp lệ: ${mapped.updatedAt}`);
      process.exit(1);
    }

    if (!checkISOString(mapped.dueAt)) {
      console.error(`Lỗi: dueAt không phải chuỗi ISO 8601 hợp lệ: ${mapped.dueAt}`);
      process.exit(1);
    }

    // Verify seedKey is NOT present in the public mapped object
    if ("seedKey" in mapped) {
      console.error("Lỗi bảo mật: Trường nội bộ seedKey bị lộ trong dữ liệu map công khai.");
      process.exit(1);
    }

    console.log("Tasks Query Firestore verification passed");
    console.log(`Database: ${dbId}`);
    console.log(`Collection: ${tasksCollection.trim()}`);
    console.log(`Document ID: ${doc.id}`);
    console.log(`Source: firestore`);
    console.log(`Timestamp mode: ${tsMode}`);
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown verification error";
    console.error("Không thể xác minh dữ liệu mẫu Firestore.");
    if (process.env.NODE_ENV !== "production") {
      console.error(message);
    }
    process.exit(1);
  }
}

main();
