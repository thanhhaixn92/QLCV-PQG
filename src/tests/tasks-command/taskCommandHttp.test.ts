import { Express } from "express";
import request from "supertest";
import { moduleRegistry } from "../../server/modules/moduleRegistry";
import { setModuleStateRepository } from "../../server/modules/state/moduleStateRepository";
import { InMemoryModuleStateRepository } from "../../server/modules/state/inMemoryModuleStateRepository";
import { moduleStateService } from "../../server/modules/moduleStateService";
import { resetMockTasksStore } from "../../server/modules/tasks-command/data/inMemoryTaskCommandRepository";
import { setTaskCommandRepository, resetTaskCommandRepository } from "../../server/modules/tasks-command/data/taskCommandRepository";
import { InMemoryTaskCommandRepository } from "../../server/modules/tasks-command/data/inMemoryTaskCommandRepository";
import { FirestoreTaskCommandRepository } from "../../server/modules/tasks-command/data/firestoreTaskCommandRepository";
import { getTaskCommandRepository } from "../../server/modules/tasks-command/data/taskCommandRepository";
import { serverConfig } from "../../server/app/serverConfig";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${msg}`);
  }
}

export async function runTaskCommandTests(getApp: () => Promise<Express>) {
  console.log("\n[KIỂM THỬ MILESTONE G6.0: TASKS COMMAND ARCHITECTURE FOUNDATION]");

  const originalEnv = process.env.TASKS_COMMAND_SOURCE;
  const stateRepo = new InMemoryModuleStateRepository();
  setModuleStateRepository(stateRepo, "in-memory");

  try {
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
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-1 Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
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
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-2 Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
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
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-3 Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
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
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-4 Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
    }

    // TC-G6-00-5: Chạy với in-memory repository thành công, kiểm tra dueAt và RLS
    try {
      resetMockTasksStore([]);
      setTaskCommandRepository(new InMemoryTaskCommandRepository());

      // Test Create bypass assigning
      const createResFail = await request(app)
        .post("/api/modules/tasks-command/tasks")
        .set("Authorization", "Bearer mock-operator:uid:dept1")
        .send({
          title: "Báo cáo công việc G6",
          departmentId: "dept2" // not their dept
        })
        .expect(403);
      assert(createResFail.body.error.code === "PERMISSION_DENIED", "Operator không được gán department khác");

      const createResFailManager = await request(app)
        .post("/api/modules/tasks-command/tasks")
        .set("Authorization", "Bearer mock-manager:uid:dept1")
        .send({
          title: "Báo cáo công việc G6"
        })
        .expect(403);
      assert(createResFailManager.body.error.code === "PERMISSION_DENIED", "Manager bắt buộc có departmentId hợp lệ");

      const createResManager = await request(app)
        .post("/api/modules/tasks-command/tasks")
        .set("Authorization", "Bearer mock-manager:uid:dept1")
        .send({
          title: "Báo cáo công việc G6",
          departmentId: "dept1"
        })
        .expect(201);
      assert(createResManager.body.success, "Manager tạo được task trong department của mình");
      const mTaskId = createResManager.body.data.task.id;

      // Other manager cannot access
      const manager403 = await request(app)
        .patch(`/api/modules/tasks-command/tasks/${mTaskId}`)
        .set("Authorization", "Bearer mock-manager:uid2:dept2")
        .send({ title: "Hack", expectedVersion: 1 })
        .expect(403);
      assert(manager403.body.error.code === "PERMISSION_DENIED", "Manager không có quyền sửa task ngoài department");

      // Patch no-op
      const patchNoOp = await request(app)
        .patch(`/api/modules/tasks-command/tasks/${mTaskId}`)
        .set("Authorization", "Bearer mock-admin")
        .send({ expectedVersion: 1 })
        .expect(400);
      assert(patchNoOp.body.error.code === "VALIDATION_FAILED", "PATCH rỗng bị từ chối");

      // Assign omitted
      const assignOmitted = await request(app)
        .put(`/api/modules/tasks-command/tasks/${mTaskId}/assignee`)
        .set("Authorization", "Bearer mock-admin")
        .send({ expectedVersion: 1 })
        .expect(400);
      
      const assignNull = await request(app)
        .put(`/api/modules/tasks-command/tasks/${mTaskId}/assignee`)
        .set("Authorization", "Bearer mock-admin")
        .send({ assigneeUid: null, expectedVersion: 1 })
        .expect(200);
      assert(assignNull.body.data.task.assignee === null, "Assignee null unassigns task");

      const assignOp = await request(app)
        .put(`/api/modules/tasks-command/tasks/${mTaskId}/assignee`)
        .set("Authorization", "Bearer mock-admin")
        .send({ assigneeUid: "uid-op", expectedVersion: 2 })
        .expect(200);
      
      const updateByAssignee = await request(app)
        .patch(`/api/modules/tasks-command/tasks/${mTaskId}`)
        .set("Authorization", "Bearer mock-operator:uid-op")
        .send({ title: "Updated by assignee", expectedVersion: 3 })
        .expect(200);
      assert(updateByAssignee.body.success, "Assignee có thể update task");

      
      setTaskCommandRepository(new InMemoryTaskCommandRepository());

      // 1. Create task with dueAt
      const dueAtStr = new Date().toISOString();
      const createRes = await request(app)
        .post("/api/modules/tasks-command/tasks")
        .set("Authorization", "Bearer mock-admin")
        .send({
          title: "Báo cáo công việc G6",
          description: "Lập nền tảng cấu trúc lệnh Tasks Command",
          priority: "high",
          dueAt: dueAtStr
        })
        .expect(201);

      assert(createRes.body.success === true, "Phải phản hồi thành công.");
      const task = createRes.body.data.task;
      assert(task.title === "Báo cáo công việc G6", "Tiêu đề phải khớp.");
      assert(task.status === "todo", "Trạng thái mặc định phải là 'todo'.");
      assert(task.dueAt === dueAtStr, "dueAt phải được bảo toàn chuẩn ISO.");
      assert(task.version === 1, "Phiên bản khởi tạo phải là 1.");
      assert(typeof createRes.body.requestId === "string", "Phải trả về requestId.");

      const taskId = task.id;

      // 2. Update task với đúng version (sử dụng PATCH)
      const updateRes = await request(app)
        .patch(`/api/modules/tasks-command/tasks/${taskId}`)
        .set("Authorization", "Bearer mock-admin")
        .send({
          title: "Báo cáo công việc G6 - Updated",
          expectedVersion: 1
        })
        .expect(200);

      assert(updateRes.body.success === true, "Phải cập nhật thành công.");
      assert(updateRes.body.data.task.version === 2, "Phiên bản phải tăng lên 2.");
      assert(updateRes.body.data.task.dueAt === dueAtStr, "Trường không cập nhật phải được bảo toàn.");

      // 3. Conflict expectedVersion
      await request(app)
        .patch(`/api/modules/tasks-command/tasks/${taskId}`)
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

      // 6. Kiểm tra RLS (Operator trying to update another's task without permission)
      const rlsRes = await request(app)
        .patch(`/api/modules/tasks-command/tasks/${taskId}`)
        .set("Authorization", "Bearer mock-operator")
        .send({
          title: "Try to bypass RLS",
          expectedVersion: 4
        })
        .expect(403);
      assert(rlsRes.body.error.code === "PERMISSION_DENIED", "Phải từ chối truy cập qua RLS.");

      // 7. Archive (DELETE)
      await request(app)
        .delete(`/api/modules/tasks-command/tasks/${taskId}`)
        .set("Authorization", "Bearer mock-admin")
        .send({
          expectedVersion: 4
        })
        .expect(200);

      console.log("   [PASSED] TC-G6-00-5: Kiểm soát ghi/sửa/phân công/OCC in-memory, dueAt và RLS thành công.");
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-5 Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Test config fail closed
    try {
      
      
      const oldEnv = serverConfig.nodeEnv;
      const oldSource = process.env.TASKS_COMMAND_SOURCE;
      
      resetTaskCommandRepository();
      
      // Simulate production & in-memory -> error
      serverConfig.nodeEnv = "production";
      process.env.TASKS_COMMAND_SOURCE = "in-memory";
      let configError = false;
      try {
        getTaskCommandRepository();
      } catch (e: unknown) {
        configError = true;
      }
      assert(configError, "Phải ném lỗi khi cố bật in-memory trong production");

      // Simulate production & default -> firestore
      resetTaskCommandRepository();
      delete process.env.TASKS_COMMAND_SOURCE;
      const repoProd = getTaskCommandRepository();
      assert(repoProd.constructor.name === "FirestoreTaskCommandRepository", "Production mặc định phải là Firestore");

      serverConfig.nodeEnv = oldEnv;
      process.env.TASKS_COMMAND_SOURCE = oldSource;
      resetTaskCommandRepository();
      console.log("   [PASSED] TC-G6-00-Config: Chặn in-memory trên production thành công.");
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-Config Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
    }

        // TC-G6-00-6: Gọi Firestore repository để tạo công việc
    try {
      setTaskCommandRepository(new FirestoreTaskCommandRepository());
      const res = await request(app)
        .post("/api/modules/tasks-command/tasks")
        .set("Authorization", "Bearer mock-admin")
        .send({
          title: "Sử dụng Firestore",
          departmentId: "dept-1"
        })
        .expect(201);
      
      assert(res.body.success, "Phản hồi phải thành công.");
      assert(res.body.data.task.title === "Sử dụng Firestore", "Tiêu đề không khớp.");
      console.log("   [PASSED] TC-G6-01-1: Tạo công việc thành công trên Firestore repository.");
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-01-1 Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
    }

  } finally {
    // Khôi phục môi trường để không ảnh hưởng test khác
    resetTaskCommandRepository();
    resetMockTasksStore([]);
    moduleStateService.resetHydrationState();
    if (originalEnv !== undefined) {
      process.env.TASKS_COMMAND_SOURCE = originalEnv;
    } else {
      delete process.env.TASKS_COMMAND_SOURCE;
    }
  }
}
