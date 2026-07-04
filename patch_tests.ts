import fs from 'fs';
let content = fs.readFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', 'utf8');
content = content.replace(/try {\n      resetMockTasksStore\((\[\])?\);/, `try {
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
        .patch(\`/api/modules/tasks-command/tasks/\${mTaskId}\`)
        .set("Authorization", "Bearer mock-manager:uid2:dept2")
        .send({ title: "Hack", expectedVersion: 1 })
        .expect(403);
      assert(manager403.body.error.code === "PERMISSION_DENIED", "Manager không có quyền sửa task ngoài department");

      // Patch no-op
      const patchNoOp = await request(app)
        .patch(\`/api/modules/tasks-command/tasks/\${mTaskId}\`)
        .set("Authorization", "Bearer mock-admin")
        .send({ expectedVersion: 1 })
        .expect(400);
      assert(patchNoOp.body.error.code === "VALIDATION_FAILED", "PATCH rỗng bị từ chối");

      // Assign omitted
      const assignOmitted = await request(app)
        .put(\`/api/modules/tasks-command/tasks/\${mTaskId}/assignee\`)
        .set("Authorization", "Bearer mock-admin")
        .send({ expectedVersion: 1 })
        .expect(400);
      
      const assignNull = await request(app)
        .put(\`/api/modules/tasks-command/tasks/\${mTaskId}/assignee\`)
        .set("Authorization", "Bearer mock-admin")
        .send({ assigneeUid: null, expectedVersion: 1 })
        .expect(200);
      assert(assignNull.body.data.task.assignee === null, "Assignee null unassigns task");

      const assignOp = await request(app)
        .put(\`/api/modules/tasks-command/tasks/\${mTaskId}/assignee\`)
        .set("Authorization", "Bearer mock-admin")
        .send({ assigneeUid: "uid-op", expectedVersion: 2 })
        .expect(200);
      
      const updateByAssignee = await request(app)
        .patch(\`/api/modules/tasks-command/tasks/\${mTaskId}\`)
        .set("Authorization", "Bearer mock-operator:uid-op")
        .send({ title: "Updated by assignee", expectedVersion: 3 })
        .expect(200);
      assert(updateByAssignee.body.success, "Assignee có thể update task");

      `);
fs.writeFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', content);
