import request from "supertest";
import { moduleRegistry } from "../../server/modules/moduleRegistry";
import { toolRegistry } from "../../server/agent/toolRegistry";
import { moduleStateService } from "../../server/modules/moduleStateService";
import { appModuleManifestSchema } from "../../shared/schemas/moduleManifestSchema";

let testFailed = false;

function assertTest(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`   ❌ [FAILED] ${msg}`);
    testFailed = true;
  } else {
    console.log(`   [PASSED] ${msg}`);
  }
}

export async function runGeminiAgentTests(getApp: () => Promise<any>) {
  console.log("\n[KIỂM THỬ TRỢ LÝ GEMINI AGENT - CP6]");

  // 1. Kiểm thử Manifest Schema
  try {
    const mod = moduleRegistry.getModule("gemini-agent");
    assertTest(!!mod, "Mô-đun 'gemini-agent' đã được đăng ký trong hệ thống.");
    
    if (mod) {
      const parsedManifest = appModuleManifestSchema.safeParse(mod.manifest);
      assertTest(parsedManifest.success, "Manifest của 'gemini-agent' hợp lệ theo Zod schema.");
      assertTest(mod.manifest.id === "gemini-agent", "ID của mô-đun khớp chính xác 'gemini-agent'.");
      assertTest(mod.manifest.requiredPermissions.includes("agent.use"), "Yêu cầu quyền truy cập 'agent.use'.");
    }
  } catch (error: any) {
    assertTest(false, `Lỗi kiểm thử manifest: ${error?.message || error}`);
  }

  // 2. Kiểm thử Tool Calling & Quyền người dùng (Security Boundaries)
  try {
    moduleRegistry.updateModuleState("gemini-agent", "enabled");
    moduleRegistry.updateModuleState("tasks-query", "enabled");
    moduleRegistry.updateModuleState("tasks-command", "enabled");

    // Lấy các công cụ cho vai trò admin (có toàn bộ quyền)
    const adminTools = toolRegistry.getToolsForUser([
      "tasks.read",
      "tasks.create",
      "tasks.update"
    ]);
    const hasListTasks = adminTools.some(t => t.name === "list_tasks");
    const hasCreateTask = adminTools.some(t => t.name === "create_task");

    assertTest(hasListTasks, "Admin lấy được công cụ 'list_tasks'.");
    assertTest(hasCreateTask, "Admin lấy được công cụ 'create_task'.");

    // Lấy các công cụ cho vai trò viewer (chỉ có đọc)
    const viewerTools = toolRegistry.getToolsForUser(["tasks.read"]);
    const viewerHasListTasks = viewerTools.some(t => t.name === "list_tasks");
    const viewerHasCreateTask = viewerTools.some(t => t.name === "create_task");

    assertTest(viewerHasListTasks, "Viewer lấy được công cụ 'list_tasks'.");
    assertTest(!viewerHasCreateTask, "Viewer KHÔNG thể lấy được công cụ 'create_task' (Chặn phân quyền thành công).");
  } catch (error: any) {
    assertTest(false, `Lỗi kiểm thử phân quyền tools: ${error?.message || error}`);
  }

  // 3. Kiểm thử API HTTP Endpoints & Kill Switch (Ngắt khẩn cấp)
  try {
    const app = await getApp();

    // 3.1. Khi mô-đun bị tắt (Kill Switch ON)
    moduleRegistry.updateModuleState("gemini-agent", "disabled");

    const responseDisabled = await request(app)
      .post("/api/modules/gemini-agent/chat")
      .set("Authorization", "Bearer mock-admin")
      .send({ message: "Hello AI" });

    assertTest(
      responseDisabled.status === 403,
      "Hệ thống chặn thành công API chat (403) khi mô-đun bị VÔ HIỆU HÓA (Kill Switch)."
    );
    assertTest(
      responseDisabled.body.error?.code === "MODULE_DISABLED",
      "Mã lỗi trả về đúng 'MODULE_DISABLED'."
    );

    // 3.2. Khi mô-đun được bật lại (Kill Switch OFF)
    moduleRegistry.updateModuleState("gemini-agent", "enabled");

    // Người dùng thiếu quyền (ví dụ viewer thiếu agent.use)
    const responseNoPermission = await request(app)
      .post("/api/modules/gemini-agent/chat")
      .set("Authorization", "Bearer mock-viewer")
      .send({ message: "Hello AI" });

    assertTest(
      responseNoPermission.status === 403,
      "Chặn thành công người dùng thiếu quyền 'agent.use' truy cập API chat."
    );

    // Người dùng hợp lệ nhưng gửi yêu cầu trống
    const responseInvalidBody = await request(app)
      .post("/api/modules/gemini-agent/chat")
      .set("Authorization", "Bearer mock-admin")
      .send({ message: "  " });

    assertTest(
      responseInvalidBody.status === 400,
      "API trả về 400 Bad Request khi gửi tin nhắn trống."
    );
  } catch (error: any) {
    assertTest(false, `Lỗi kiểm thử HTTP endpoints: ${error?.message || error}`);
  }

  if (testFailed) {
    throw new Error("Một số ca kiểm thử Trợ lý Gemini Agent (CP6) thất bại!");
  }
}
