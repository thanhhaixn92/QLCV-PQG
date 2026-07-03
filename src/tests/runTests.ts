import { moduleRegistry } from "../server/modules/moduleRegistry";
import { toolRegistry } from "../server/agent/toolRegistry";
import { appModuleManifestSchema } from "../shared/schemas/moduleManifestSchema";
import { registerAllModules } from "../server/modules/registerModules";
import { createServer } from "../server/app/createServer";
import { AppError } from "../shared/errors/appError";

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
  
  // Register the mock tool specifically for testing isolation
  toolRegistry.registerTool({
    name: "queryTasksTool",
    moduleId: "tasks-query",
    risk: "read",
    requiredPermissions: ["tasks.read"],
    requiresApproval: false,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    async execute(input, context) {
      return { success: true, message: "Mock Tasks result", tasks: [] };
    }
  });

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

  // Test Case 4: Safe Multi-Instantiation
  console.log("\n[TC 4] Khởi tạo Máy chủ nhiều lần (Safe Multi-Instantiation):");
  try {
    const serverInstance1 = await createServer();
    const serverInstance2 = await createServer();
    assert(!!serverInstance1 && !!serverInstance2, "Khởi tạo thành công nhiều instance máy chủ mà không gây lỗi hoặc xung đột registry.");
  } catch (error) {
    assert(false, `Lỗi khi khởi tạo máy chủ nhiều lần: ${error instanceof Error ? error.message : error}`);
  }

  // Test Case 5: AppError Status Mapping
  console.log("\n[TC 5] Kiểm tra Ánh xạ HTTP Status Code của AppError:");
  const errAuth = new AppError("AUTH_REQUIRED", "Thử nghiệm");
  const errPerm = new AppError("PERMISSION_DENIED", "Thử nghiệm");
  const errVal = new AppError("VALIDATION_FAILED", "Thử nghiệm");
  const errConf = new AppError("DATA_CONFLICT", "Thử nghiệm");
  const errMod = new AppError("MODULE_UNAVAILABLE", "Thử nghiệm");
  const errDep = new AppError("DEPENDENCY_UNAVAILABLE", "Thử nghiệm");
  const errInternal = new AppError("INTERNAL_ERROR", "Thử nghiệm");

  assert(errAuth.getStatusCode() === 401, "AUTH_REQUIRED tương ứng HTTP 401.");
  assert(errPerm.getStatusCode() === 403, "PERMISSION_DENIED tương ứng HTTP 403.");
  assert(errVal.getStatusCode() === 400, "VALIDATION_FAILED tương ứng HTTP 400.");
  assert(errConf.getStatusCode() === 409, "DATA_CONFLICT tương ứng HTTP 409.");
  assert(errMod.getStatusCode() === 503, "MODULE_UNAVAILABLE tương ứng HTTP 503.");
  assert(errDep.getStatusCode() === 503, "DEPENDENCY_UNAVAILABLE tương ứng HTTP 503.");
  assert(errInternal.getStatusCode() === 500, "INTERNAL_ERROR tương ứng HTTP 500.");

  // Test Case 6: Post-Registration Dependency Validation
  console.log("\n[TC 6] Kiểm tra Hậu kiểm thử phụ thuộc (Dependency Validation):");
  // Register a module missing its dependency
  moduleRegistry.registerModule({
    id: "dependent-module",
    displayName: "Mô-đun phụ thuộc",
    description: "Cần dependency chưa có",
    routes: [],
    requiredPermissions: [],
    dependencies: {
      required: ["missing-dependency-id"],
      optional: []
    },
    tools: []
  }, "disabled");

  const validationResult = moduleRegistry.validateDependencies();
  assert(!validationResult.success, "Dependency validation trả về thất bại khi thiếu dependency bắt buộc.");
  assert(validationResult.warnings.length > 0, "Trả về cảnh báo có cấu trúc khi phát hiện thiếu dependency.");

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
