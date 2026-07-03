import dotenv from "dotenv";
dotenv.config();

import { getConfiguredFirestore } from "../src/server/infrastructure/firebase/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { serverConfig } from "../src/server/app/serverConfig";

async function main() {
  const firebaseDatabaseId = process.env.FIREBASE_DATABASE_ID;
  const tasksCollection = process.env.TASKS_COLLECTION;
  const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const firebaseServiceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // 1. Verify TASKS_COLLECTION
  if (!tasksCollection || !tasksCollection.trim()) {
    console.error("Thiếu TASKS_COLLECTION");
    process.exit(1);
  }

  // 2. Verify FIREBASE_DATABASE_ID
  const isProduction = process.env.NODE_ENV === "production" || serverConfig.nodeEnv === "production";
  if (isProduction && (!firebaseDatabaseId || !firebaseDatabaseId.trim())) {
    console.error("Thiếu FIREBASE_DATABASE_ID");
    process.exit(1);
  }

  const dbId = (firebaseDatabaseId && firebaseDatabaseId.trim()) ? firebaseDatabaseId.trim() : "(default)";

  // 3. Verify credentials presence before starting
  const hasCredentials = !!(
    firebaseServiceAccountJson ||
    firebaseServiceAccountBase64 ||
    googleApplicationCredentials ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.K_SERVICE
  );

  if (!hasCredentials) {
    console.error("Thiếu thông tin xác thực Firebase Admin. Vui lòng cấu hình FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, hoặc GOOGLE_APPLICATION_CREDENTIALS.");
    process.exit(1);
  }

  try {
    const db = getConfiguredFirestore();
    const dedupKey = process.env.SEED_TASK_DEDUP_KEY || "initial-test-task";

    // 4. Check duplication using query on seedKey
    const querySnapshot = await db
      .collection(tasksCollection.trim())
      .where("seedKey", "==", dedupKey)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      console.log("Seed task already exists");
      process.exit(0);
    }

    // 5. Construct sample document with explicit Firestore timestamps
    const now = Timestamp.now();
    const sevenDaysLater = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const sampleDoc = {
      title: "Công việc thử nghiệm",
      status: "todo",
      priority: "medium",
      creatorUid: "admin-uid-h1",
      assigneeUid: "admin-uid-h1",
      departmentId: "dept-test",
      creatorName: "Admin Test",
      assigneeName: "Admin Test",
      createdAt: now,
      updatedAt: now,
      dueAt: sevenDaysLater,
      seedKey: dedupKey
    };

    // 6. Save document with Auto-ID
    const docRef = await db.collection(tasksCollection.trim()).add(sampleDoc);

    console.log("Seed task created successfully");
    console.log(`Collection: ${tasksCollection.trim()}`);
    console.log(`Document ID: ${docRef.id}`);
    console.log(`Database: ${dbId}`);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Firestore seed error";
    console.error("Không thể tạo dữ liệu mẫu Firestore.");
    if (process.env.NODE_ENV !== "production") {
      console.error(message);
    }
    process.exit(1);
  }
}

main();
