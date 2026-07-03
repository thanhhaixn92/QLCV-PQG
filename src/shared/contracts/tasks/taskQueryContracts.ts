import { TaskSummary, TaskStatus, TaskPriority } from "./taskContracts";

export interface TaskListQuery {
  limit?: number;
  cursor?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeUid?: string;
  departmentId?: string;
  dueFrom?: string;
  dueTo?: string;
  updatedAfter?: string;
  sortBy?: "updatedAt" | "dueAt" | "createdAt";
  sortDirection?: "asc" | "desc";
}

export interface TaskListResult {
  items: TaskSummary[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  query: {
    limit: number;
    sortBy: "updatedAt" | "dueAt" | "createdAt";
    sortDirection: "asc" | "desc";
  };
  source: "firestore" | "fixture";
}

export interface TaskQueryContext {
  actorUid?: string;
  actorRole?: string;
  permissions: string[];
  departmentIds?: string[];
}
