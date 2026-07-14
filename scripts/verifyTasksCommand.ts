import { config } from "dotenv";
config();
process.env.TASKS_COMMAND_SOURCE = "firestore"; // Ensure live verification uses firestore
import { taskCommandService } from "../src/server/modules/tasks-command/services/taskCommandService";
import { TaskCommandContext } from "../src/server/modules/tasks-command/contracts/taskCommandTypes";
import { getConfiguredFirestore } from "../src/server/infrastructure/firebase/firebaseAdmin";
import crypto from "crypto";

async function verify() {
  console.log("Starting Live Firestore Verification for Tasks Command");

  // Mock context as an admin
  const context: TaskCommandContext = {
    actorUid: "verify-script-uid",
    actorRole: "admin",
    permissions: ["tasks.manage"],
    departmentIds: ["verify-dept"],
    requestId: `verify-${crypto.randomUUID()}`
  };

  const markerTitle = `Live Verification Task ${new Date().toISOString()}`;
  let taskId = "";
  
  try {
    // 1. Create task
    const created = await taskCommandService.createTask({
      title: markerTitle,
      description: "This is a temporary task for verification.",
      priority: "medium",
      departmentId: "verify-dept"
    }, context);
    
    taskId = created.id;
    console.log("✅ Create: Success", taskId);
    
    // 2. Read back (bypass query module for pure verification)
    const db = getConfiguredFirestore();
    const doc = await db.collection("tasks").doc(taskId).get();
    if (!doc.exists) {
      throw new Error("Task document not found in Firestore");
    }
    const taskData = doc.data() as any;
    console.log("✅ Read: Document found", taskData.title);

    // 3. Update
    const updated = await taskCommandService.updateTask(taskId, {
      title: markerTitle + " Updated",
      expectedVersion: created.version
    }, context);
    console.log("✅ Update: Success, new version", updated.version);

    // 4. Conflict check (using old version)
    try {
      await taskCommandService.updateTask(taskId, {
        title: "Should fail",
        expectedVersion: created.version
      }, context);
      throw new Error("Expected version conflict, but update succeeded");
    } catch (err: any) {
      if (err.code === "TASK_VERSION_CONFLICT") {
        console.log("✅ Conflict Check: Caught version conflict correctly");
      } else {
        throw err;
      }
    }

    // 5. Assign
    const assigned = await taskCommandService.assignTask(taskId, { assigneeUid: "user-123", expectedVersion: updated.version }, context);
    console.log("✅ Assign: Success, assignee", assigned.assignee?.uid);

    // 6. Transition
    const started = await taskCommandService.transitionTask(taskId, { transition: "start", expectedVersion: assigned.version }, context);
    console.log("✅ Transition (start): Success, status", started.status);
    const completed = await taskCommandService.transitionTask(taskId, { transition: "complete", expectedVersion: started.version }, context);
    console.log("✅ Transition (complete): Success, status", completed.status);

    // 7. Archive
    await taskCommandService.archiveTask(taskId, completed.version, context);
    console.log("✅ Archive: Success");

    // Verify soft delete
    const archivedDoc = await db.collection("tasks").doc(taskId).get();
    const archivedData = archivedDoc.data() as any;
    if (!archivedData.archivedAt) {
      throw new Error("archivedAt is not set");
    }
    console.log("✅ Verified archivedAt is set:", archivedData.archivedAt);

    console.log("All live verifications passed!");
  } catch (error) {
    console.error("❌ Live verification failed:", error);
    process.exit(1);
  } finally {
    if (taskId) {
      try {
        console.log(`Cleaning up task ${taskId}`);
        const db = getConfiguredFirestore();
        await db.collection("tasks").doc(taskId).delete();
      } catch (e) {
        console.error("Failed to clean up", e);
      }
    }
    process.exit(0);
  }
}

verify();
