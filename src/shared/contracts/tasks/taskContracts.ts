export type TaskStatus = "backlog" | "todo" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  assignee: {
    uid?: string;
    displayName?: string;
  } | null;
  creator: {
    uid?: string;
    displayName?: string;
  } | null;
  departmentId: string | null;
  collaboratorIds?: string[];
  attachments?: TaskAttachment[];
  dueAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  version?: number;
  archivedAt?: string | null;
  source: "firestore" | "fixture";
}
