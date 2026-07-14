import { Filter, Query, DocumentData, Timestamp } from "firebase-admin/firestore";
import { TaskQueryRepository } from "./taskQueryTypes";
import { TaskSummary } from "../../../../shared/contracts/tasks/taskContracts";
import { TaskListQuery, TaskListResult, TaskQueryContext } from "../../../../shared/contracts/tasks/taskQueryContracts";
import { getFirebaseStatus, getConfiguredFirestore } from "../../../infrastructure/firebase/firebaseAdmin";
import { AppError } from "../../../../shared/errors/appError";
import { taskDocumentMapper } from "./taskDocumentMapper";
import { taskCursor } from "./taskCursor";
import { logger } from "../../../infrastructure/logging/logger";
import { serverConfig } from "../../../app/serverConfig";
import { mapFirestoreError } from "./firestoreTaskQueryErrorMapper";

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

    const db = getConfiguredFirestore();
    const collectionRef = db.collection(this.collectionName);

    // 1. Build Base Security and Business Filters
    let queryRef: Query<DocumentData> = collectionRef;

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
      "updatedAt",
      "version",
      "archivedAt"
    );

    // Dynamic filtering array
    const filters: Filter[] = [];

    // RBAC Security Policy
    const isAdmin = context.actorRole === "admin" || context.permissions.includes("tasks.manage");
    const hasDeptPermission = context.permissions.includes("tasks.department");
    const hasReadPermission = context.permissions.includes("tasks.read");

    if (isAdmin) {
      // Admin bypasses security constraints, applies direct query filters
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
    } else if (hasDeptPermission) {
      const authorizedDepts = context.departmentIds ?? [];
      if (authorizedDepts.length === 0) {
        return {
          items: [],
          pageInfo: { nextCursor: null, hasNextPage: false },
          query: { limit, sortBy, sortDirection },
          source: "firestore"
        };
      }
      
      if (authorizedDepts.length > 10) {
        throw new AppError(
          "VALIDATION_FAILED",
          "Truy cập đồng thời trên hơn 10 phòng ban hiện chưa được hệ thống hỗ trợ."
        );
      }

      if (query.departmentId) {
        if (!authorizedDepts.includes(query.departmentId)) {
          throw new AppError(
            "PERMISSION_DENIED",
            "Bạn không có quyền truy cập dữ liệu của phòng ban được yêu cầu."
          );
        }
        filters.push(Filter.where("departmentId", "==", query.departmentId));
      } else {
        filters.push(Filter.where("departmentId", "in", authorizedDepts));
      }

      if (query.assigneeUid) {
        filters.push(
          Filter.or(
            Filter.where("assignee.uid", "==", query.assigneeUid),
            Filter.where("assigneeUid", "==", query.assigneeUid)
          )
        );
      }
    } else if (hasReadPermission) {
      const actorUid = context.actorUid || "anonymous";
      
      if (query.assigneeUid && query.assigneeUid !== actorUid) {
        throw new AppError(
          "PERMISSION_DENIED",
          "Bạn không có quyền truy cập công việc của người dùng khác."
        );
      }

      if (query.departmentId) {
        filters.push(Filter.where("departmentId", "==", query.departmentId));
      }

      filters.push(
        Filter.or(
          Filter.where("creator.uid", "==", actorUid),
          Filter.where("creatorUid", "==", actorUid),
          Filter.where("assignee.uid", "==", actorUid),
          Filter.where("assigneeUid", "==", actorUid)
        )
      );
    } else {
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

    // Apply Date Range Filters with strict type strategies
    const tsMode = serverConfig.tasksTimestampMode || process.env.TASKS_TIMESTAMP_MODE;
    const hasDateFilters = query.dueFrom || query.dueTo || query.updatedAfter;

    if (hasDateFilters) {
      if (tsMode !== "firestore" && tsMode !== "iso-string") {
        throw new AppError(
          "VALIDATION_FAILED",
          "Truy vấn khoảng thời gian (date range filter) chưa được cấu hình chế độ dữ liệu (TASKS_TIMESTAMP_MODE)."
        );
      }
    }

    const toFirestoreValue = (isoStr: string) => {
      if (tsMode === "firestore") {
        return Timestamp.fromDate(new Date(isoStr));
      }
      return isoStr;
    };

    if (query.dueFrom) {
      filters.push(Filter.where("dueAt", ">=", toFirestoreValue(query.dueFrom)));
    }
    if (query.dueTo) {
      filters.push(Filter.where("dueAt", "<=", toFirestoreValue(query.dueTo)));
    }
    if (query.updatedAfter) {
      filters.push(Filter.where("updatedAt", ">=", toFirestoreValue(query.updatedAfter)));
    }

    // Attach all accumulated filters as an AND filter if any exist
    if (filters.length > 0) {
      queryRef = queryRef.where(Filter.and(...filters));
    }

    // Sorting definition (Must sort by custom sortBy then sub-sort stable by __name__ / ID)
    queryRef = queryRef.orderBy(sortBy, sortDirection).orderBy("__name__", sortDirection);

    let items: TaskSummary[] = [];
    let invalidRecordCount = 0;
    const maxLoops = 5;
    let currentLoop = 0;
    let lastProcessedDoc: DocumentData | null = null;

    try {
      while (items.length < limit + 1 && currentLoop < maxLoops) {
        let batchQuery = queryRef;
        const fetchSize = limit + 1 - items.length;
        batchQuery = batchQuery.limit(fetchSize);

        if (lastProcessedDoc) {
          batchQuery = batchQuery.startAfter(lastProcessedDoc);
        } else if (query.cursor) {
          const cursorData = taskCursor.deserialize(query.cursor, sortBy, query);
          let sortVal: string | number | null | Timestamp = cursorData.sortValue;
          
          if (sortBy === "dueAt" || sortBy === "updatedAt" || sortBy === "createdAt") {
            if (tsMode === "firestore" && typeof sortVal === "string") {
              sortVal = Timestamp.fromDate(new Date(sortVal));
            }
          }
          batchQuery = batchQuery.startAfter(sortVal, cursorData.documentId);
        }

        const snapshot = await batchQuery.get();
        const docs = snapshot.docs;
        if (docs.length === 0) {
          break;
        }

        for (const doc of docs) {
          lastProcessedDoc = doc;
          const mapped = taskDocumentMapper.map(doc.id, doc.data(), "firestore");
          if (mapped) {
            if (mapped.archivedAt) {
              // Skip archived tasks in in-memory filter to avoid requiring Firestore composite indexes
              continue;
            }
            items.push(mapped);
            if (items.length >= limit + 1) {
              break;
            }
          } else {
            invalidRecordCount++;
          }
        }

        if (docs.length < fetchSize) {
          break;
        }
        currentLoop++;
      }

      // Check lookahead
      const hasLookahead = items.length > limit;
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
          sortValue: lastItem[sortBy as "updatedAt" | "dueAt" | "createdAt"] as string | number | null,
          documentId: lastItem.id
        }, query);
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
      throw mapFirestoreError(error, "FirestoreTaskQueryRepository (list)");
    }
  }

  async getById(taskId: string, context: TaskQueryContext): Promise<TaskSummary | null> {
    const db = getConfiguredFirestore();
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
        if (
          task.creator?.uid === actorUid ||
          task.assignee?.uid === actorUid
        ) {
          return task;
        }
      }

      return null;
    } catch (error: unknown) {
      throw mapFirestoreError(error, "FirestoreTaskQueryRepository (getById)");
    }
  }
}
