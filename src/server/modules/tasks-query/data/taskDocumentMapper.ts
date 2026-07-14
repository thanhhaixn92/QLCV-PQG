import { TaskSummary, TaskStatus, TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";

export const taskDocumentMapper = {
  map(docId: string, docData: Record<string, unknown> | null | undefined, source: "firestore" | "fixture"): TaskSummary | null {
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
    } else if (rawStatus === "cancelled") {
      status = "cancelled";
    }

    // Safely map priority
    let priority: TaskPriority | null = null;
    const rawPriority = docData.priority;
    if (rawPriority === "high" || rawPriority === "medium" || rawPriority === "low") {
      priority = rawPriority as TaskPriority;
    }

    // Safely map assignee
    let assignee: { uid?: string; displayName?: string } | null = null;
    if (docData.assignee && typeof docData.assignee === "object") {
      const assObj = docData.assignee as Record<string, unknown>;
      assignee = {
        uid: assObj.uid ? String(assObj.uid) : undefined,
        displayName: assObj.displayName ? String(assObj.displayName) : undefined
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
      const creObj = docData.creator as Record<string, unknown>;
      creator = {
        uid: creObj.uid ? String(creObj.uid) : undefined,
        displayName: creObj.displayName ? String(creObj.displayName) : undefined
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
    const parseTimestamp = (ts: unknown): string | null => {
      if (!ts) return null;
      try {
        if (typeof ts === "object" && ts !== null) {
          const tsObj = ts as Record<string, unknown>;
          if (typeof tsObj.toDate === "function") {
            const date = (tsObj.toDate as () => Date)();
            if (date instanceof Date && !isNaN(date.getTime())) {
              return date.toISOString();
            }
            return null;
          }
          if (tsObj._seconds !== undefined) {
            const sec = Number(tsObj._seconds);
            if (!isNaN(sec) && isFinite(sec)) {
              const date = new Date(sec * 1000);
              if (!isNaN(date.getTime())) {
                return date.toISOString();
              }
            }
            return null;
          }
        }
        if (ts instanceof Date) {
          if (!isNaN(ts.getTime())) {
            return ts.toISOString();
          }
          return null;
        }
        const strVal = String(ts);
        const parsed = Date.parse(strVal);
        if (!isNaN(parsed)) {
          const date = new Date(parsed);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      } catch {
        return null;
      }
      return null;
    };

    const dueAt = parseTimestamp(docData.dueAt);
    const createdAt = parseTimestamp(docData.createdAt) || new Date().toISOString();
    const updatedAt = parseTimestamp(docData.updatedAt) || createdAt;
    const archivedAt = docData.archivedAt ? parseTimestamp(docData.archivedAt) : null;
    const version = typeof docData.version === "number" ? docData.version : undefined;

    const departmentId = docData.departmentId ? String(docData.departmentId) : null;

    const description = docData.description ? String(docData.description) : undefined;
    const collaboratorIds = Array.isArray(docData.collaboratorIds) ? docData.collaboratorIds.map(String) : undefined;
    const attachments = Array.isArray(docData.attachments) ? docData.attachments.map((a: any) => ({
      id: String(a.id),
      name: String(a.name),
      url: String(a.url),
      size: typeof a.size === 'number' ? a.size : undefined
    })) : undefined;

    return {
      id: docId,
      title,
      description,
      status,
      priority,
      assignee,
      creator,
      departmentId,
      collaboratorIds,
      attachments,
      dueAt,
      createdAt,
      updatedAt,
      version,
      archivedAt,
      source
    };
  }
};
