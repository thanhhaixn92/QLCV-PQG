import { moduleRegistry } from "../server/modules/moduleRegistry";
import { toolRegistry } from "../server/agent/toolRegistry";
import { appModuleManifestSchema } from "../shared/schemas/moduleManifestSchema";
import { registerAllModules } from "../server/modules/registerModules";

let failed = false;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAILED] ${msg}`);
    failed = true;
  } else {
    console.log(`   [PASSED] ${msg}`);
  }
}

async function runAllTests() {
  console.log("=================================================");
  console.log("   BẮT ĐẦU CHẠY CÁC CA KIỂM THỬ TỰ ĐỘNG - QLCV   ");
  console.log("=================================================");

  // Test Case 1: Zod Schema Validation
  console.log("\n[TC 1] Xác thực Schema Module Manifest (Zod):");
  const validManifest = {
    id: "test-module",
    displayName: "Module Thử Nghiệm",
    description: "Mô tả chi tiết",
    routes: ["/test"],
    requiredPermissions: ["tasks.read"],
    dependencies: {
      required: [],
      optional: []
    },
    tools: ["testTool"]
  };
  const parseResult = appModuleManifestSchema.safeParse(validManifest);
  assert(parseResult.success, "Xác thực manifest hợp lệ thành công.");

  const invalidManifest = {
    id: "", // Blank ID is disallowed
    displayName: "Module lỗi"
  };
  const failParse = appModuleManifestSchema.safeParse(invalidManifest);
  assert(!failParse.success, "Ngăn chặn cấu hình ID trống thành công.");

  // Test Case 2: Module Registry operations
  console.log("\n[TC 2] Thao tác trên Module Registry:");
  registerAllModules();
  
  const existing = moduleRegistry.getModule("tasks-query");
  assert(!!existing, "Module 'tasks-query' đã được đăng ký và tìm thấy.");
  assert(existing?.state === "disabled", "Mặc định 'tasks-query' đăng ký ở trạng thái 'disabled'.");

  const duplicateResult = moduleRegistry.registerModule({
    id: "tasks-query",
    displayName: "Trùng ID",
    description: "Bản sao trùng tên",
    routes: ["/tasks-query-dup"],
    requiredPermissions: [],
    dependencies: { required: [], optional: [] },
    tools: []
  });
  assert(!duplicateResult.success, "Ngăn chặn đăng ký trùng lặp ID thành công.");

  // Test Case 3: Tool Registry security
  console.log("\n[TC 3] Kiểm soát công cụ tại Tool Registry:");
  const userToolsDisabled = toolRegistry.getToolsForUser(["tasks.read"]);
  const hasQueryTasksTool = userToolsDisabled.some(t => t.name === "queryTasksTool");
  assert(!hasQueryTasksTool, "Không truy xuất được công cụ của mô-đun khi mô-đun bị tắt.");

  moduleRegistry.updateModuleState("tasks-query", "enabled");
  const userToolsEnabled = toolRegistry.getToolsForUser(["tasks.read"]);
  const hasQueryTasksToolEnabled = userToolsEnabled.some(t => t.name === "queryTasksTool");
  assert(hasQueryTasksToolEnabled, "Cho phép gọi công cụ của mô-đun khi mô-đun được bật.");

  const userToolsNoPerms = toolRegistry.getToolsForUser([]);
  const hasQueryTasksToolNoPerms = userToolsNoPerms.some(t => t.name === "queryTasksTool");
  assert(!hasQueryTasksToolNoPerms, "Ngăn chặn gọi công cụ khi người dùng thiếu quyền hạn.");

  console.log("\n=================================================");
  if (failed) {
    console.error("❌ MỘT SỐ CA KIỂM THỬ THẤT BẠI. KIỂM TRA LẠI LOGS.");
    process.exit(1);
  } else {
    console.log("🎉 TẤT CẢ CA KIỂM THỬ ĐÃ VƯỢT QUA THÀNH CÔNG!");
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error("Lỗi thực thi kiểm thử:", err);
  process.exit(1);
});
