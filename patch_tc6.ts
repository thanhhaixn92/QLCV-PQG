import fs from 'fs';
let content = fs.readFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', 'utf8');

// Replace the TC-G6-00-6 test section
const tc6Pattern = /\/\/ TC-G6-00-6:(.|\n)*?catch \(error: unknown\) {(.|\n)*?}/;
const newTc6 = `    // TC-G6-00-6: Gọi Firestore repository để tạo công việc
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
    }`;

content = content.replace(tc6Pattern, newTc6);
content = content.replace(/TC-G6-00-6: Firestore command repository skeleton trả NOT_IMPLEMENTED chuẩn xác\./, 'TC-G6-01-1: Tạo công việc thành công trên Firestore repository.');

fs.writeFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', content);
