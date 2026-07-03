import { getFirestore, Filter } from "firebase-admin/firestore";
import { TaskQueryRepository } from "./taskQueryTypes";
import { TaskSummary, TaskStatus, TaskPriority } from "../../../../shared/contracts/tasks/taskContracts";
import { TaskListQuery, TaskListResult, TaskQueryContext } from "../../../../shared/contracts/tasks/taskQueryContracts";
import { getFirebaseStatus } from "../../../infrastructure/firebase/firebaseAdmin";
import { AppError } from "../../../../shared/errors/appError";
import { taskDocumentMapper } from "./taskDocumentMapper";
import { taskCursor } from "./taskCursor";
import { logger } from "../../../infrastructure/logging/logger";

export class FirestoreTaskQueryRepository implements TaskQueryRepository {
  private collectionName: string;

  constructor() {
    const fbStatus = getFirebaseStatus();
    if (fbStatus.status !== "ready" && fbStatus.status !== "initialized") {
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "Firestore không khả dụng để truy vấn công việc tại thời điểm này."
      );
    }

    const collection = process.env.TASKS_COLLECTION;
    if (!collection || !collection.trim()) {
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "Cấu hình hệ thống thiếu tên collection nguồn (TASKS_COLLECTION)."
      );
    }

    this.collectionName = collection.trim();
  }

  async list(query: TaskListQuery, context: TaskQueryContext): Promise<TaskListResult> {
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? "updatedAt";
    const sortDirection = query.sortDirection ?? "desc";

    const db = getFirestore();
    const collectionRef = db.collection(this.collectionName);

    // 1. Build Base Security and Business Filters
    let queryRef: any = collectionRef;

    // Apply selective projection for performance & data minimalization
    queryRef = queryRef.select(
      "title",
      "status",
      "priority",
      "assignee",
      "creator",
      "assigneeUid",
      "assigneeName",
      "creatorUid",
      "creatorName",
      "departmentId",
      "dueAt",
      "createdAt",
      "updatedAt"
    );

    // Dynamic filtering array
    const filters: any[] = [];

    // RBAC Security Policy
    const isAdmin = context.actorRole === "admin" || context.permissions.includes("tasks.manage");
    const hasDeptPermission = context.permissions.includes("tasks.department");
    const hasReadPermission = context.permissions.includes("tasks.read");

    if (isAdmin) {
      // Admin bypasses security constraints
    } else if (hasDeptPermission) {
      const authorizedDepts = context.departmentIds ?? [];
      if (authorizedDepts.length === 0) {
        // Safe early return: authorized but has no assigned departments
        return {
          items: [],
          pageInfo: { nextCursor: null, hasNextPage: false },
          query: { limit, sortBy, sortDirection },
          source: "firestore"
        };
      }
      
      // Firestore IN operator max limit is 10 items
      const cappedDepts = authorizedDepts.slice(0, 10);
      filters.push(Filter.where("departmentId", "in", cappedDepts));
    } else if (hasReadPermission) {
      const actorUid = context.actorUid || "anonymous";
      // Support legacy structure + new structure
      filters.push(
        Filter.or(
          Filter.where("creator.uid", "==", actorUid),
          Filter.where("creatorUid", "==", actorUid),
          Filter.where("assignee.uid", "==", actorUid),
          Filter.where("assigneeUid", "==", actorUid)
        )
      );
    } else {
      // User has no valid tasks query permission
      return {
        items: [],
        pageInfo: { nextCursor: null, hasNextPage: false },
        query: { limit, sortBy, sortDirection },
        source: "firestore"
      };
    }

    // Apply standard business query filters
    if (query.status) {
      filters.push(Filter.where("status", "==", query.status));
    }
    if (query.priority) {
      filters.push(Filter.where("priority", "==", query.priority));
    }
    if (query.assigneeUid) {
      filters.push(
        Filter.or(
          Filter.where("assignee.uid", "==", query.assigneeUid),
          Filter.where("assigneeUid", "==", query.assigneeUid)
        )
      );
    }
    if (query.departmentId) {
      filters.push(Filter.where("departmentId", "==", query.departmentId));
    }

    // Apply Date Range Filters
    if (query.dueFrom) {
      filters.push(Filter.where("dueAt", ">=", query.dueFrom));
    }
    if (query.dueTo) {
      filters.push(Filter.where("dueAt", "<=", query.dueTo));
    }
    if (query.updatedAfter) {
      filters.push(Filter.where("updatedAt", ">=", query.updatedAfter));
    }

    // Attach all accumulated filters as an AND filter if any exist
    if (filters.length > 0) {
      queryRef = queryRef.where(Filter.and(...filters));
    }

    // Sorting definition (Must sort by custom sortBy then sub-sort stable by __name__ / ID)
    queryRef = queryRef.orderBy(sortBy, sortDirection).orderBy("__name__", sortDirection);

    // Apply lookahead limit
    queryRef = queryRef.limit(limit + 1);

    // Pagination cursor handling
    if (query.cursor) {
      const cursorData = taskCursor.deserialize(query.cursor, sortBy);
      
      // Let's handle different Firestore types for cursor sorting value.
      // If the sort value is a valid ISO date, we can pass it as a string to startAfter.
      let sortVal = cursorData.sortValue;
      queryRef = queryRef.startAfter(sortVal, cursorData.documentId);
    }

    try {
      const snapshot = await queryRef.get();
      const docs = snapshot.docs;

      let items: TaskSummary[] = [];
      let invalidRecordCount = 0;

      for (const doc of docs) {
        const mapped = taskDocumentMapper.map(doc.id, doc.data(), "firestore");
        if (mapped) {
          items.push(mapped);
        } else {
          invalidRecordCount++;
        }
      }

      // Check lookahead
      const hasLookahead = docs.length > limit;
      let hasNextPage = hasLookahead;

      // Slice items to meet exact limit
      if (items.length > limit) {
        items = items.slice(0, limit);
        hasNextPage = true;
      }

      let nextCursor: string | null = null;
      if (hasNextPage && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = taskCursor.serialize({
          sortBy,
          sortValue: lastItem[sortBy],
          documentId: lastItem.id
        });
      }

      if (invalidRecordCount > 0) {
        logger.warn(
          `FirestoreTaskQueryRepository: Phát hiện ${invalidRecordCount} bản ghi lỗi cấu trúc dữ liệu không hợp lệ.`
        );
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
        source: "firestore"
      };
    } catch (error: unknown) {
      const err = error as any;
      // Handle Missing Composite Index beautifully
      if (err.code === 9 || (typeof err.message === "string" && err.message.includes("FAILED_PRECONDITION"))) {
        const match = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        const indexUrl = match ? match[0] : null;
        logger.error(
          `FirestoreTaskQueryRepository: Thiếu index composite cho truy vấn này. Lỗi: ${err.message}`
        );
        throw new AppError(
          "DEPENDENCY_UNAVAILABLE",
          `Hệ thống yêu cầu thiết lập chỉ mục composite Firestore.` +
            (indexUrl ? ` Vui lòng truy cập liên kết sau để tạo chỉ mục: ${indexUrl}` : "")
        );
      }

      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`FirestoreTaskQueryRepository: Lỗi truy vấn Firestore: ${errMsg}`);
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "Dịch vụ lưu trữ Firestore gặp sự cố truy vấn tại thời điểm này."
      );
    }
  }

  async getById(taskId: string, context: TaskQueryContext): Promise<TaskSummary | null> {
    const db = getFirestore();
    try {
      const doc = await db.collection(this.collectionName).doc(taskId).get();
      if (!doc.exists) {
        return null;
      }

      const task = taskDocumentMapper.map(doc.id, doc.data(), "firestore");
      if (!task) {
        return null;
      }

      // Security Checks
      const isAdmin = context.actorRole === "admin" || context.permissions.includes("tasks.manage");
      const hasDeptPermission = context.permissions.includes("tasks.department");
      const hasReadPermission = context.permissions.includes("tasks.read");

      if (isAdmin) {
        return task;
      } else if (hasDeptPermission) {
        const authorizedDepts = context.departmentIds ?? [];
        if (task.departmentId && authorizedDepts.includes(task.departmentId)) {
          return task;
        }
      } else if (hasReadPermission) {
        const actorUid = context.actorUid;
        if (task.creator?.uid === actorUid || task.assignee?.uid === actorUid) {
          return task;
        }
      }

      return null;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`FirestoreTaskQueryRepository: Lỗi getById từ Firestore: ${errMsg}`);
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "Dịch vụ lưu trữ Firestore gặp sự cố truy vấn tại thời điểm này."
      );
    }
  }
}
