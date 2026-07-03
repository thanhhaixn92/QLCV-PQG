import { Express } from "express";
import request from "supertest";
import { moduleRegistry } from "../../server/modules/moduleRegistry";
import { setModuleStateRepository } from "../../server/modules/state/moduleStateRepository";
import { InMemoryModuleStateRepository } from "../../server/modules/state/inMemoryModuleStateRepository";
import { moduleStateService } from "../../server/modules/moduleStateService";
import { resetMockTasksStore } from "../../server/modules/tasks-command/data/inMemoryTaskCommandRepository";
import { setTaskCommandRepository } from "../../server/modules/tasks-command/data/taskCommandRepository";
import { InMemoryTaskCommandRepository } from "../../server/modules/tasks-command/data/inMemoryTaskCommandRepository";
import { FirestoreTaskCommandRepository } from "../../server/modules/tasks-command/data/firestoreTaskCommandRepository";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${msg}`);
  }
}

export async function runTaskCommandTests(getApp: () => Promise<Express>) {
  console.log("\n[KIỂM THỬ MILESTONE G6.0: TASKS COMMAND ARCHITECTURE FOUNDATION]");

  const stateRepo = new InMemoryModuleStateRepository();
  setModuleStateRepository(stateRepo, "in-memory");
  
  await stateRepo.set({
    moduleId: "tasks-query",
    state: "enabled",
    updatedBy: "test-setup"
  });

  await stateRepo.set({
    moduleId: "tasks-command",
    state: "disabled",
    updatedBy: "test-setup"
  });

  moduleStateService.resetHydrationState();
  const app = await getApp();

  // TC-G6-00-1: Module mặc định disabled
  try {
    const mod = moduleRegistry.getModule("tasks-command");
    assert(!!mod, "Mô-đun tasks-command phải được đăng ký.");
    assert(mod?.state === "disabled", "Mô-đun tasks-command mặc định phải ở trạng thái disabled.");
    console.log("   [PASSED] TC-G6-00-1: Mô-đun tasks-command đã được đăng ký ở trạng thái disabled mặc định.");
  } catch (e: any) {
    console.error("   ❌ TC-G6-00-1 Thất bại:", e.message);
    throw e;
  }

  // TC-G6-00-2: Gọi API khi module disabled trả MODULE_DISABLED (403)
  try {
    const res = await request(app)
      .post("/api/modules/tasks-command/tasks")
      .set("Authorization", "Bearer mock-admin")
      .send({ title: "Test Task" })
      .expect(403);

    assert(!res.body.success, "Phản hồi thành công phải là false hoặc không có.");
    assert(res.body.error?.code === "MODULE_DISABLED", "Mã lỗi phải là MODULE_DISABLED.");
    assert(typeof res.body.error?.requestId === "string", "Phải trả về requestId.");
    console.log("   [PASSED] TC-G6-00-2: API bị chặn chính xác với lỗi MODULE_DISABLED khi mô-đun bị tắt.");
  } catch (e: any) {
    console.error("   ❌ TC-G6-00-2 Thất bại:", e.message);
    throw e;
  }

  await stateRepo.set({
    moduleId: "tasks-command",
    state: "enabled",
    updatedBy: "test-setup"
  });
  moduleRegistry.updateModuleState("tasks-command", "enabled");
  moduleStateService.resetHydrationState();

  // TC-G6-00-3: Thiếu quyền truy cập trả PERMISSION_DENIED (403)
  try {
    const res = await request(app)
      .post("/api/modules/tasks-command/tasks")
      .set("Authorization", "Bearer mock-viewer")
      .send({ title: "Test Task" })
      .expect(403);

    assert(!res.body.success, "Phản hồi thành công phải là false hoặc không có.");
    assert(res.body.error?.code === "PERMISSION_DENIED", "Mã lỗi phải là PERMISSION_DENIED.");
    console.log("   [PASSED] TC-G6-00-3: API trả về PERMISSION_DENIED chính xác đối với người dùng thiếu quyền hạn.");
  } catch (e: any) {
    console.error("   ❌ TC-G6-00-3 Thất bại:", e.message);
    throw e;
  }

  // TC-G6-00-4: Gửi dữ liệu không hợp lệ (sai schema) trả VALIDATION_FAILED (400)
  try {
    const res = await request(app)
      .post("/api/modules/tasks-command/tasks")
      .set("Authorization", "Bearer mock-admin")
      .send({
        title: "",
        extraField: "garbage"
      })
      .expect(400);

    assert(!res.body.success, "Phản hồi thành công phải là false hoặc không có.");
    assert(res.body.error?.code === "VALIDATION_FAILED", "Mã lỗi phải là VALIDATION_FAILED.");
    console.log("   [PASSED] TC-G6-00-4: Giao dịch bị chặn chính xác khi dữ liệu đầu vào không hợp lệ hoặc chứa các trường lạ.");
  } catch (e: any) {
    console.error("   ❌ TC-G6-00-4 Thất bại:", e.message);
    throw e;
  }

  // TC-G6-00-5: Chạy với in-memory repository thành công
  try {
    resetMockTasksStore([]);
    setTaskCommandRepository(new InMemoryTaskCommandRepository());

    // 1. Create task
    const createRes = await request(app)
      .post("/api/modules/tasks-command/tasks")
      .set("Authorization", "Bearer mock-admin")
      .send({
        title: "Báo cáo công việc G6",
        description: "Lập nền tảng cấu trúc lệnh Tasks Command",
        priority: "high"
      })
      .expect(201);

    assert(createRes.body.success === true, "Phải phản hồi thành công.");
    const task = createRes.body.data.task;
    assert(task.title === "Báo cáo công việc G6", "Tiêu đề phải khớp.");
    assert(task.status === "todo", "Trạng thái mặc định phải là 'todo'.");
    assert(task.version === 1, "Phiên bản khởi tạo phải là 1.");
    assert(typeof createRes.body.requestId === "string", "Phải trả về requestId.");

    const taskId = task.id;

    // 2. Update task với đúng version
    const updateRes = await request(app)
      .put(`/api/modules/tasks-command/tasks/${taskId}`)
      .set("Authorization", "Bearer mock-admin")
      .send({
        title: "Báo cáo công việc G6 - Updated",
        expectedVersion: 1
      })
      .expect(200);

    assert(updateRes.body.success === true, "Phải cập nhật thành công.");
    assert(updateRes.body.data.task.version === 2, "Phiên bản phải tăng lên 2.");

    // 3. Conflict expectedVersion
    await request(app)
      .put(`/api/modules/tasks-command/tasks/${taskId}`)
      .set("Authorization", "Bearer mock-admin")
      .send({
        title: "Báo cáo công việc G6 - Conflict",
        expectedVersion: 1
      })
      .expect(409);

    // 4. State transition
    const transRes = await request(app)
      .post(`/api/modules/tasks-command/tasks/${taskId}/transitions`)
      .set("Authorization", "Bearer mock-admin")
      .send({
        transition: "start",
        expectedVersion: 2
      })
      .expect(200);

    assert(transRes.body.data.task.status === "in_progress", "Trạng thái phải chuyển sang 'in_progress'.");

    // 5. Assignment
    const assignRes = await request(app)
      .put(`/api/modules/tasks-command/tasks/${taskId}/assignee`)
      .set("Authorization", "Bearer mock-admin")
      .send({
        assigneeUid: "user-999",
        expectedVersion: 3
      })
      .expect(200);

    assert(assignRes.body.data.task.assignee?.uid === "user-999", "Mã người nhận phải khớp.");

    // 6. Archive (DELETE)
    await request(app)
      .delete(`/api/modules/tasks-command/tasks/${taskId}`)
      .set("Authorization", "Bearer mock-admin")
      .send({
        expectedVersion: 4
      })
      .expect(200);

    console.log("   [PASSED] TC-G6-00-5: Kiểm soát ghi/sửa/phân công/OCC in-memory thành công.");
  } catch (e: any) {
    console.error("   ❌ TC-G6-00-5 Thất bại:", e.message);
    throw e;
  }

  // TC-G6-00-6: Gọi Firestore repository trả NOT_IMPLEMENTED (501)
  try {
    setTaskCommandRepository(new FirestoreTaskCommandRepository());

    const res = await request(app)
      .post("/api/modules/tasks-command/tasks")
      .set("Authorization", "Bearer mock-admin")
      .send({
        title: "Sử dụng Firestore"
      })
      .expect(501);

    assert(!res.body.success, "Phản hồi thành công phải là false hoặc không có.");
    assert(res.body.error?.code === "NOT_IMPLEMENTED", "Mã lỗi phải là NOT_IMPLEMENTED.");
    console.log("   [PASSED] TC-G6-00-6: Firestore command repository skeleton trả NOT_IMPLEMENTED chuẩn xác.");
  } catch (e: any) {
    console.error("   ❌ TC-G6-00-6 Thất bại:", e.message);
    throw e;
  }
}
