import { TaskQueryRepository } from "./taskQueryTypes";
import { TaskSummary, TaskStatus, TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";
import { TaskListQuery, TaskListResult, TaskQueryContext } from "../../../../shared/contracts/tasks/taskQueryContracts";
import { taskCursor } from "./taskCursor";
import { AppError } from "../../../../shared/errors/appError";

// A rich dataset of 25 mock tasks representing different dates, departments, priorities, and assignees.
const mockTasksData: Omit<TaskSummary, "source">[] = [
  {
    id: "task-01",
    title: "Phê duyệt thiết kế hệ thống QLCV_PQG",
    status: "completed",
    priority: "high",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-a",
    dueAt: "2026-07-10T17:00:00.000Z",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z"
  },
  {
    id: "task-02",
    title: "Triển khai hạ tầng Firestore",
    status: "in_progress",
    priority: "high",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-a",
    dueAt: "2026-07-15T17:00:00.000Z",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-02T11:30:00.000Z"
  },
  {
    id: "task-03",
    title: "Viết test case cho G3",
    status: "completed",
    priority: "medium",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "user-123", displayName: "Nguyễn Văn A" },
    departmentId: "dept-a",
    dueAt: "2026-07-05T17:00:00.000Z",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-03T12:00:00.000Z"
  },
  {
    id: "task-04",
    title: "Đánh giá an toàn thông tin (Security Audit)",
    status: "todo",
    priority: "high",
    assignee: null,
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-b",
    dueAt: "2026-07-20T17:00:00.000Z",
    createdAt: "2026-07-01T11:00:00.000Z",
    updatedAt: "2026-07-01T11:00:00.000Z"
  },
  {
    id: "task-05",
    title: "Xây dựng sơ đồ phân quyền người dùng",
    status: "todo",
    priority: "low",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "user-123", displayName: "Nguyễn Văn A" },
    departmentId: "dept-b",
    dueAt: "2026-07-18T17:00:00.000Z",
    createdAt: "2026-07-02T08:00:00.000Z",
    updatedAt: "2026-07-02T08:00:00.000Z"
  },
  {
    id: "task-06",
    title: "Họp giao ban định kỳ quý III",
    status: "completed",
    priority: "medium",
    assignee: { uid: "user-789", displayName: "Lê Văn C" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-c",
    dueAt: "2026-07-02T17:00:00.000Z",
    createdAt: "2026-07-02T09:00:00.000Z",
    updatedAt: "2026-07-02T17:30:00.000Z"
  },
  {
    id: "task-07",
    title: "Tối ưu hóa hiệu năng truy vấn",
    status: "in_progress",
    priority: "high",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "user-789", displayName: "Lê Văn C" },
    departmentId: "dept-a",
    dueAt: "2026-07-25T17:00:00.000Z",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-03T14:00:00.000Z"
  },
  {
    id: "task-08",
    title: "Cấu hình CI/CD trên Cloud Run",
    status: "backlog",
    priority: "medium",
    assignee: null,
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: null,
    dueAt: null,
    createdAt: "2026-07-02T11:00:00.000Z",
    updatedAt: "2026-07-02T11:00:00.000Z"
  },
  {
    id: "task-09",
    title: "Viết tài liệu hướng dẫn vận hành",
    status: "todo",
    priority: "low",
    assignee: { uid: "user-789", displayName: "Lê Văn C" },
    creator: { uid: "user-456", displayName: "Trần Thị B" },
    departmentId: "dept-c",
    dueAt: "2026-07-30T17:00:00.000Z",
    createdAt: "2026-07-02T12:00:00.000Z",
    updatedAt: "2026-07-02T12:00:00.000Z"
  },
  {
    id: "task-10",
    title: "Kiểm thử tải hệ thống (Load Testing)",
    status: "backlog",
    priority: "high",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-a",
    dueAt: "2026-08-05T17:00:00.000Z",
    createdAt: "2026-07-02T13:00:00.000Z",
    updatedAt: "2026-07-02T13:00:00.000Z"
  },
  {
    id: "task-11",
    title: "Sao lưu cơ sở dữ liệu định kỳ",
    status: "completed",
    priority: "high",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-b",
    dueAt: "2026-07-03T17:00:00.000Z",
    createdAt: "2026-07-02T14:00:00.000Z",
    updatedAt: "2026-07-03T01:00:00.000Z"
  },
  {
    id: "task-12",
    title: "Khắc phục lỗi phân trang G3.1",
    status: "completed",
    priority: "medium",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "user-123", displayName: "Nguyễn Văn A" },
    departmentId: "dept-a",
    dueAt: "2026-07-04T17:00:00.000Z",
    createdAt: "2026-07-02T15:00:00.000Z",
    updatedAt: "2026-07-02T18:00:00.000Z"
  },
  {
    id: "task-13",
    title: "Xây dựng dashboard tổng hợp công việc",
    status: "in_progress",
    priority: "medium",
    assignee: { uid: "user-789", displayName: "Lê Văn C" },
    creator: { uid: "user-123", displayName: "Nguyễn Văn A" },
    departmentId: "dept-c",
    dueAt: "2026-07-28T17:00:00.000Z",
    createdAt: "2026-07-03T08:00:00.000Z",
    updatedAt: "2026-07-03T09:00:00.000Z"
  },
  {
    id: "task-14",
    title: "Thiết kế logo thương hiệu mới",
    status: "todo",
    priority: "low",
    assignee: null,
    creator: { uid: "user-456", displayName: "Trần Thị B" },
    departmentId: "dept-b",
    dueAt: "2026-08-10T17:00:00.000Z",
    createdAt: "2026-07-03T09:00:00.000Z",
    updatedAt: "2026-07-03T09:00:00.000Z"
  },
  {
    id: "task-15",
    title: "Tổ chức hội thảo ứng dụng AI",
    status: "todo",
    priority: "medium",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "user-789", displayName: "Lê Văn C" },
    departmentId: "dept-c",
    dueAt: "2026-07-25T17:00:00.000Z",
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z"
  },
  {
    id: "task-16",
    title: "Cập nhật chính sách bảo mật thông tin",
    status: "todo",
    priority: "high",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-b",
    dueAt: "2026-07-15T17:00:00.000Z",
    createdAt: "2026-07-03T11:00:00.000Z",
    updatedAt: "2026-07-03T11:00:00.000Z"
  },
  {
    id: "task-17",
    title: "Nâng cấp các package lỗi thời",
    status: "in_progress",
    priority: "low",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-a",
    dueAt: "2026-07-12T17:00:00.000Z",
    createdAt: "2026-07-03T12:00:00.000Z",
    updatedAt: "2026-07-03T13:30:00.000Z"
  },
  {
    id: "task-18",
    title: "Rà soát mã nguồn định kỳ",
    status: "completed",
    priority: "medium",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "user-123", displayName: "Nguyễn Văn A" },
    departmentId: "dept-b",
    dueAt: "2026-07-04T17:00:00.000Z",
    createdAt: "2026-07-03T13:00:00.000Z",
    updatedAt: "2026-07-03T16:00:00.000Z"
  },
  {
    id: "task-19",
    title: "Phân tích dữ liệu người dùng",
    status: "backlog",
    priority: "medium",
    assignee: null,
    creator: { uid: "user-789", displayName: "Lê Văn C" },
    departmentId: "dept-c",
    dueAt: null,
    createdAt: "2026-07-03T14:00:00.000Z",
    updatedAt: "2026-07-03T14:00:00.000Z"
  },
  {
    id: "task-20",
    title: "Tối ưu dung lượng ảnh tải lên",
    status: "todo",
    priority: "low",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "user-456", displayName: "Trần Thị B" },
    departmentId: "dept-a",
    dueAt: "2026-08-01T17:00:00.000Z",
    createdAt: "2026-07-03T15:00:00.000Z",
    updatedAt: "2026-07-03T15:00:00.000Z"
  },
  {
    id: "task-21",
    title: "Thiết lập hệ thống log tập trung",
    status: "backlog",
    priority: "high",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-b",
    dueAt: "2026-08-20T17:00:00.000Z",
    createdAt: "2026-07-03T16:00:00.000Z",
    updatedAt: "2026-07-03T16:00:00.000Z"
  },
  {
    id: "task-22",
    title: "Đồng bộ hóa lịch làm việc",
    status: "completed",
    priority: "medium",
    assignee: null,
    creator: { uid: "user-789", displayName: "Lê Văn C" },
    departmentId: "dept-c",
    dueAt: "2026-07-04T17:00:00.000Z",
    createdAt: "2026-07-03T17:00:00.000Z",
    updatedAt: "2026-07-03T17:30:00.000Z"
  },
  {
    id: "task-23",
    title: "Soạn thảo kịch bản thuyết trình",
    status: "in_progress",
    priority: "low",
    assignee: { uid: "user-789", displayName: "Lê Văn C" },
    creator: { uid: "user-123", displayName: "Nguyễn Văn A" },
    departmentId: "dept-c",
    dueAt: "2026-07-08T17:00:00.000Z",
    createdAt: "2026-07-04T08:00:00.000Z",
    updatedAt: "2026-07-04T09:00:00.000Z"
  },
  {
    id: "task-24",
    title: "Kiểm tra bảo mật API endpoints",
    status: "todo",
    priority: "high",
    assignee: { uid: "user-456", displayName: "Trần Thị B" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-b",
    dueAt: "2026-07-15T17:00:00.000Z",
    createdAt: "2026-07-04T09:00:00.000Z",
    updatedAt: "2026-07-04T09:00:00.000Z"
  },
  {
    id: "task-25",
    title: "Tổng kết bàn giao G4",
    status: "todo",
    priority: "medium",
    assignee: { uid: "user-123", displayName: "Nguyễn Văn A" },
    creator: { uid: "admin-uid", displayName: "Hệ thống" },
    departmentId: "dept-a",
    dueAt: "2026-07-10T17:00:00.000Z",
    createdAt: "2026-07-04T10:00:00.000Z",
    updatedAt: "2026-07-04T10:00:00.000Z"
  }
];

export class FixtureTaskQueryRepository implements TaskQueryRepository {
  async list(query: TaskListQuery, context: TaskQueryContext): Promise<TaskListResult> {
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? "updatedAt";
    const sortDirection = query.sortDirection ?? "desc";

    // 1. Apply Security Policy/RBAC Filters first
    let allowedTasks = mockTasksData.map((t) => ({ ...t, source: "fixture" as const }));

    const isAdmin = context.actorRole === "admin" || context.permissions.includes("tasks.manage");
    const hasDeptPermission = context.permissions.includes("tasks.department");
    const hasReadPermission = context.permissions.includes("tasks.read");

    if (isAdmin) {
      // Admin sees everything
    } else if (hasDeptPermission) {
      // Department permission: only see tasks in authorized departmentIds
      const authorizedDepts = context.departmentIds ?? [];
      allowedTasks = allowedTasks.filter(
        (t) => t.departmentId && authorizedDepts.includes(t.departmentId)
      );
    } else if (hasReadPermission) {
      // Normal user: only see tasks they created or are assigned to
      const actorUid = context.actorUid;
      allowedTasks = allowedTasks.filter(
        (t) => t.creator?.uid === actorUid || t.assignee?.uid === actorUid
      );
    } else {
      // No permissions
      allowedTasks = [];
    }

    // 2. Apply query filters
    if (query.status) {
      allowedTasks = allowedTasks.filter((t) => t.status === query.status);
    }
    if (query.priority) {
      allowedTasks = allowedTasks.filter((t) => t.priority === query.priority);
    }
    if (query.assigneeUid) {
      allowedTasks = allowedTasks.filter((t) => t.assignee?.uid === query.assigneeUid);
    }
    if (query.departmentId) {
      allowedTasks = allowedTasks.filter((t) => t.departmentId === query.departmentId);
    }
    if (query.dueFrom) {
      const fromTime = new Date(query.dueFrom).getTime();
      allowedTasks = allowedTasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() >= fromTime);
    }
    if (query.dueTo) {
      const toTime = new Date(query.dueTo).getTime();
      allowedTasks = allowedTasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= toTime);
    }
    if (query.updatedAfter) {
      const afterTime = new Date(query.updatedAfter).getTime();
      allowedTasks = allowedTasks.filter(
        (t) => t.updatedAt && new Date(t.updatedAt).getTime() >= afterTime
      );
    }

    // 3. Sort stable helper
    const getSortValue = (task: TaskSummary): number => {
      const rawVal = task[sortBy];
      if (rawVal === null || rawVal === undefined) {
        return sortDirection === "desc" ? -Infinity : Infinity; // place null values at the end
      }
      return new Date(rawVal).getTime();
    };

    const compareTasks = (a: TaskSummary, b: TaskSummary): number => {
      const valA = getSortValue(a);
      const valB = getSortValue(b);

      if (valA !== valB) {
        if (sortDirection === "desc") {
          return valB - valA;
        } else {
          return valA - valB;
        }
      }

      // Stable sub-sorting by document ID
      if (sortDirection === "desc") {
        return b.id.localeCompare(a.id);
      } else {
        return a.id.localeCompare(b.id);
      }
    };

    let sortedTasks = allowedTasks.sort(compareTasks);

    // 4. Implement Cursor-based Pagination
    if (query.cursor) {
      const cursorData = taskCursor.deserialize(query.cursor, sortBy);
      const cursorVal = cursorData.sortValue;
      const cursorTime = cursorVal ? new Date(cursorVal as string).getTime() : null;
      const cursorDocId = cursorData.documentId;

      sortedTasks = sortedTasks.filter((t) => {
        const tVal = t[sortBy];
        const tTime = tVal ? new Date(tVal).getTime() : null;

        if (sortDirection === "desc") {
          // Sort value of t is less than cursor sortValue
          const tTimeVal = tTime ?? -Infinity;
          const cTimeVal = cursorTime ?? -Infinity;

          if (tTimeVal < cTimeVal) {
            return true;
          }
          if (tTimeVal === cTimeVal) {
            return t.id.localeCompare(cursorDocId) < 0;
          }
          return false;
        } else {
          // Sort value of t is greater than cursor sortValue
          const tTimeVal = tTime ?? Infinity;
          const cTimeVal = cursorTime ?? Infinity;

          if (tTimeVal > cTimeVal) {
            return true;
          }
          if (tTimeVal === cTimeVal) {
            return t.id.localeCompare(cursorDocId) > 0;
          }
          return false;
        }
      });
    }

    // 5. Lookahead slicing (limit + 1)
    const hasLookahead = sortedTasks.length > limit;
    const items = sortedTasks.slice(0, limit);
    const hasNextPage = hasLookahead;

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = taskCursor.serialize({
        sortBy,
        sortValue: lastItem[sortBy],
        documentId: lastItem.id
      });
    }

    return {
      items,
      pageInfo: {
        nextCursor,
        hasNextPage
      },
      query: {
        limit,
        sortBy,
        sortDirection
      },
      source: "fixture"
    };
  }

  async getById(taskId: string, context: TaskQueryContext): Promise<TaskSummary | null> {
    const task = mockTasksData.find((t) => t.id === taskId);
    if (!task) {
      return null;
    }

    const fullTask: TaskSummary = { ...task, source: "fixture" };

    // Apply security constraints
    const isAdmin = context.actorRole === "admin" || context.permissions.includes("tasks.manage");
    const hasDeptPermission = context.permissions.includes("tasks.department");
    const hasReadPermission = context.permissions.includes("tasks.read");

    if (isAdmin) {
      return fullTask;
    } else if (hasDeptPermission) {
      const authorizedDepts = context.departmentIds ?? [];
      if (fullTask.departmentId && authorizedDepts.includes(fullTask.departmentId)) {
        return fullTask;
      }
    } else if (hasReadPermission) {
      const actorUid = context.actorUid;
      if (fullTask.creator?.uid === actorUid || fullTask.assignee?.uid === actorUid) {
        return fullTask;
      }
    }

    return null;
  }
}
