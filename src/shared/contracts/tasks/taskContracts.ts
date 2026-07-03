export type TaskStatus = "backlog" | "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskSummary {
  id: string;
  title: string;
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
  dueAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  source: "firestore" | "fixture";
}
