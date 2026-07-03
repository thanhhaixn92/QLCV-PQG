import { TaskListQuery, TaskListResult, TaskQueryContext } from "../../../../shared/contracts/tasks/taskQueryContracts";
import { TaskSummary } from "../../../../shared/contracts/tasks/taskContracts";

export interface TaskQueryRepository {
  list(query: TaskListQuery, context: TaskQueryContext): Promise<TaskListResult>;
  getById(taskId: string, context: TaskQueryContext): Promise<TaskSummary | null>;
}
