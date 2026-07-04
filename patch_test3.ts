import fs from 'fs';
let content = fs.readFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', 'utf8');
content = content.replace('// TC-G6-00-6: Gọi Firestore repository trả NOT_IMPLEMENTED (501)', `// Test config fail closed
    try {
      const { getTaskCommandRepository, resetTaskCommandRepository: resetConfigRepo } = require('../../server/modules/tasks-command/data/taskCommandRepository');
      const { serverConfig } = require('../../server/app/serverConfig');
      const oldEnv = serverConfig.nodeEnv;
      const oldSource = process.env.TASKS_COMMAND_SOURCE;
      
      resetConfigRepo();
      
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
      resetConfigRepo();
      delete process.env.TASKS_COMMAND_SOURCE;
      const repoProd = getTaskCommandRepository();
      assert(repoProd.constructor.name === "FirestoreTaskCommandRepository", "Production mặc định phải là Firestore");

      serverConfig.nodeEnv = oldEnv;
      process.env.TASKS_COMMAND_SOURCE = oldSource;
      resetConfigRepo();
      console.log("   [PASSED] TC-G6-00-Config: Chặn in-memory trên production thành công.");
    } catch (error: unknown) {
      console.error("   ❌ TC-G6-00-Config Thất bại:", error instanceof Error ? error.message : String(error));
      throw error;
    }

    // TC-G6-00-6: Gọi Firestore repository trả NOT_IMPLEMENTED (501)`);
fs.writeFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', content);
