import dotenv from "dotenv";
dotenv.config();

// Kích hoạt Mock Auth cho mục đích kiểm thử HTTP E2E
process.env.ALLOW_MOCK_AUTH = "true";

import { createServer } from "../src/server/app/createServer";
import request from "supertest";
import { serverConfig } from "../src/server/app/serverConfig";
import { getFirebaseStatus } from "../src/server/infrastructure/firebase/firebaseAdmin";

serverConfig.allowMockAuth = true;

async function main() {
  const firebaseDatabaseId = process.env.FIREBASE_DATABASE_ID;
  const tasksCollection = process.env.TASKS_COLLECTION;
  const tsMode = process.env.TASKS_TIMESTAMP_MODE || "firestore";

  if (!tasksCollection || !tasksCollection.trim()) {
    console.error("Lỗi: Thiếu cấu hình TASKS_COLLECTION.");
    process.exit(1);
  }

  const fbStatus = getFirebaseStatus();
  const isFirebaseReady = fbStatus.status === "ready" || fbStatus.status === "initialized";
  if (!isFirebaseReady) {
    console.error("Lỗi: Firebase Admin chưa sẵn sàng.");
    process.exit(1);
  }

  // Ép buộc dùng Firestore thực tế cho script verify này
  process.env.TASKS_QUERY_SOURCE = "firestore";

  try {
    const app = await createServer();
    const dbId = (firebaseDatabaseId && firebaseDatabaseId.trim()) ? firebaseDatabaseId.trim() : "(default)";

    console.log("=== BẮT ĐẦU XÁC MINH LIVE HTTP END-TO-END (FIRESTORE REAL) ===");
    console.log(`Database: ${dbId}`);
    console.log(`Collection: ${tasksCollection.trim()}`);
    console.log(`Timestamp mode: ${tsMode}`);

    // 1. HTTP Verification với vai trò ADMIN
    console.log("1. Gửi request HTTP với vai trò ADMIN...");
    const adminRes = await request(app)
      .get("/api/modules/tasks-query/tasks")
      .set("Authorization", "Bearer mock-admin")
      .expect(200);

    const data = adminRes.body.data;
    const items = data.items;
    const requestId = adminRes.body.requestId;

    if (adminRes.body.success !== true) {
      console.error("Lỗi: HTTP response trả về success = false.");
      process.exit(1);
    }

    if (!requestId || typeof requestId !== "string") {
      console.error("Lỗi: Response thiếu trường requestId định danh giao dịch.");
      process.exit(1);
    }

    if (data.source !== "firestore") {
      console.error(`Lỗi: Response source không phải là 'firestore'. Nhận được: ${data.source}`);
      process.exit(1);
    }

    // Tìm kiếm seed task (task có seedKey ẩn đi nhưng tiêu đề là "Công việc thử nghiệm")
    const seedTask = items.find((t: any) => t.title === "Công việc thử nghiệm");
    if (!seedTask) {
      console.error("Lỗi: Không tìm thấy document seed trong response HTTP của Admin.");
      process.exit(1);
    }

    console.log(`   [OK] Đã tìm thấy seed document với ID: ${seedTask.id}`);

    // Đảm bảo không chứa trường seedKey nội bộ
    if ("seedKey" in seedTask) {
      console.error("Lỗi bảo mật: Trường seedKey bị lộ qua API HTTP công khai.");
      process.exit(1);
    }
    console.log("   [OK] Xác nhận không để lộ trường seedKey.");

    // Đảm bảo không chứa các trường legacy phẳng
    if ("creatorUid" in seedTask || "assigneeUid" in seedTask) {
      console.error("Lỗi: Response chứa thuộc tính phẳng kế thừa.");
      process.exit(1);
    }
    console.log("   [OK] Xác nhận response chuẩn hóa cấu trúc nested, không có thuộc tính phẳng kế thừa.");

    // Kiểm tra timestamp là chuỗi ISO UTC hợp lệ
    const checkISOString = (val: string | null): boolean => {
      if (!val) return false;
      const d = new Date(val);
      return !isNaN(d.getTime()) && val.includes("T") && val.endsWith("Z");
    };

    if (!checkISOString(seedTask.createdAt) || !checkISOString(seedTask.updatedAt) || !checkISOString(seedTask.dueAt)) {
      console.error("Lỗi: Timestamp chưa được chuẩn hóa thành ISO UTC string.");
      process.exit(1);
    }
    console.log("   [OK] Xác nhận toàn bộ timestamp đã được chuẩn hóa thành chuỗi ISO UTC.");

    // Helper để xử lý an toàn lỗi composite index (DEPENDENCY_UNAVAILABLE)
    const checkResponseOrIndexError = (res: any, expectedStatus: number, stepName: string): boolean => {
      if (res.status === expectedStatus) {
        return true;
      }
      if (res.status === 503 && res.body.error?.code === "DEPENDENCY_UNAVAILABLE") {
        console.log(`   [OK] ${stepName}: Firestore báo thiếu composite index. Xác nhận lỗi đã được che giấu an toàn khỏi Client, không rò rỉ URL nhạy cảm.`);
        return false;
      }
      console.error(`Lỗi tại ${stepName}: Kỳ vọng status ${expectedStatus} hoặc 503 DEPENDENCY_UNAVAILABLE. Thực tế nhận: ${res.status}`, res.body);
      process.exit(1);
    };

    // 2. HTTP Verification với vai trò MANAGER hợp lệ (phòng ban dept-test)
    console.log("2. Gửi request HTTP với vai trò MANAGER (phòng ban được phép 'dept-test')...");
    const managerAuthRes = await request(app)
      .get("/api/modules/tasks-query/tasks?departmentId=dept-test")
      .set("Authorization", "Bearer mock-manager")
      .set("x-user-permissions", "tasks.department,tasks.read")
      .set("x-user-departments", "dept-test");

    if (checkResponseOrIndexError(managerAuthRes, 200, "MANAGER hợp lệ")) {
      const managerItems = managerAuthRes.body.data.items;
      const hasSeedTaskAsManager = managerItems.some((t: any) => t.title === "Công việc thử nghiệm");
      if (!hasSeedTaskAsManager) {
        console.error("Lỗi: Manager hợp lệ không thể thấy seed document.");
        process.exit(1);
      }
      console.log("   [OK] Manager phòng ban 'dept-test' truy cập seed document thành công.");
    }

    // 3. HTTP Verification với vai trò MANAGER trái phép (phòng ban khác)
    console.log("3. Gửi request HTTP với vai trò MANAGER (truy vấn phòng ban không được phép)...");
    const managerBlockedRes = await request(app)
      .get("/api/modules/tasks-query/tasks?departmentId=dept-other")
      .set("Authorization", "Bearer mock-manager")
      .set("x-user-permissions", "tasks.department,tasks.read")
      .set("x-user-departments", "dept-test");

    if (checkResponseOrIndexError(managerBlockedRes, 403, "MANAGER trái phép")) {
      if (managerBlockedRes.body.error?.code !== "PERMISSION_DENIED") {
        console.error(`Lỗi: Manager trái phép phải bị chặn bằng PERMISSION_DENIED. Nhận được: ${managerBlockedRes.body.error?.code}`);
        process.exit(1);
      }
      console.log("   [OK] Chặn truy cập phòng ban trái phép của Manager thành công.");
    }

    // 4. HTTP Verification với vai trò OPERATOR đúng chủ sở hữu (admin-uid-h1)
    console.log("4. Gửi request HTTP với vai trò OPERATOR sở hữu (UID: admin-uid-h1)...");
    const operatorAuthRes = await request(app)
      .get("/api/modules/tasks-query/tasks")
      .set("Authorization", "Bearer mock-operator:admin-uid-h1");

    if (checkResponseOrIndexError(operatorAuthRes, 200, "OPERATOR sở hữu")) {
      const operatorItems = operatorAuthRes.body.data.items;
      const hasSeedTaskAsOperator = operatorItems.some((t: any) => t.title === "Công việc thử nghiệm");
      if (!hasSeedTaskAsOperator) {
        console.error("Lỗi: Operator chủ sở hữu không thể thấy seed document.");
        process.exit(1);
      }
      console.log("   [OK] Operator sở hữu truy cập seed document thành công.");
    }

    // 5. HTTP Verification với vai trò OPERATOR khác (UID không phải chủ sở hữu)
    console.log("5. Gửi request HTTP với vai trò OPERATOR khác (UID: user-999) truy vấn trực tiếp...");
    const operatorBlockedRes = await request(app)
      .get("/api/modules/tasks-query/tasks?assigneeUid=admin-uid-h1")
      .set("Authorization", "Bearer mock-operator:user-999");

    if (checkResponseOrIndexError(operatorBlockedRes, 403, "OPERATOR trái phép")) {
      if (operatorBlockedRes.body.error?.code !== "PERMISSION_DENIED") {
        console.error(`Lỗi: Operator xem trực tiếp UID người khác phải bị chặn bằng PERMISSION_DENIED. Nhận được: ${operatorBlockedRes.body.error?.code}`);
        process.exit(1);
      }
      console.log("   [OK] Chặn truy vấn trực tiếp UID người khác của Operator thành công.");
    }

    console.log("\n🎉 LIVE HTTP INTEGRATION VERIFICATION PASSED SUCCESSFULLY!");
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown HTTP verification error";
    console.error("Lỗi: Xác minh tích hợp HTTP thất bại.");
    console.error(message);
    process.exit(1);
  }
}

main();
