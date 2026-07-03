import { TaskSummary, TaskStatus, TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";

export const taskDocumentMapper = {
  map(docId: string, docData: any, source: "firestore" | "fixture"): TaskSummary | null {
    if (!docId || typeof docId !== "string" || !docId.trim()) {
      return null;
    }
    if (!docData || typeof docData !== "object") {
      return null;
    }

    const title = docData.title || docData.name;
    if (typeof title !== "string" || !title.trim()) {
      return null;
    }

    // Safely map status
    let status: TaskStatus = "todo";
    const rawStatus = docData.status;
    if (rawStatus === "completed" || rawStatus === "done") {
      status = "completed";
    } else if (rawStatus === "pending" || rawStatus === "in_progress") {
      status = "in_progress";
    } else if (rawStatus === "backlog") {
      status = "backlog";
    } else if (rawStatus === "todo") {
      status = "todo";
    }

    // Safely map priority
    let priority: TaskPriority | null = null;
    const rawPriority = docData.priority;
    if (rawPriority === "high" || rawPriority === "medium" || rawPriority === "low") {
      priority = rawPriority;
    }

    // Safely map assignee
    let assignee: { uid?: string; displayName?: string } | null = null;
    if (docData.assignee && typeof docData.assignee === "object") {
      assignee = {
        uid: docData.assignee.uid ? String(docData.assignee.uid) : undefined,
        displayName: docData.assignee.displayName ? String(docData.assignee.displayName) : undefined
      };
    } else if (typeof docData.assignee === "string") {
      // legacy support
      assignee = {
        displayName: docData.assignee
      };
    } else if (docData.assigneeUid) {
      assignee = {
        uid: String(docData.assigneeUid),
        displayName: docData.assigneeName ? String(docData.assigneeName) : undefined
      };
    }

    // Safely map creator
    let creator: { uid?: string; displayName?: string } | null = null;
    if (docData.creator && typeof docData.creator === "object") {
      creator = {
        uid: docData.creator.uid ? String(docData.creator.uid) : undefined,
        displayName: docData.creator.displayName ? String(docData.creator.displayName) : undefined
      };
    } else if (docData.creatorUid) {
      creator = {
        uid: String(docData.creatorUid),
        displayName: docData.creatorName ? String(docData.creatorName) : undefined
      };
    } else if (typeof docData.creator === "string") {
      creator = {
        displayName: docData.creator
      };
    }

    // Safely parse timestamps
    const parseTimestamp = (ts: any): string | null => {
      if (!ts) return null;
      if (typeof ts.toDate === "function") {
        return ts.toDate().toISOString();
      }
      if (ts instanceof Date) {
        return ts.toISOString();
      }
      if (typeof ts === "object" && ts._seconds !== undefined) {
        return new Date(ts._seconds * 1000).toISOString();
      }
      const parsed = Date.parse(String(ts));
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
      return null;
    };

    const dueAt = parseTimestamp(docData.dueAt);
    const createdAt = parseTimestamp(docData.createdAt) || new Date().toISOString();
    const updatedAt = parseTimestamp(docData.updatedAt) || createdAt;

    const departmentId = docData.departmentId ? String(docData.departmentId) : null;

    return {
      id: docId,
      title,
      status,
      priority,
      assignee,
      creator,
      departmentId,
      dueAt,
      createdAt,
      updatedAt,
      source
    };
  }
};
