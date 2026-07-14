import { getFirebaseStatus, getConfiguredFirestore } from "../infrastructure/firebase/firebaseAdmin";
import { logger } from "../infrastructure/logging/logger";
import { AppError } from "../../shared/errors/appError";
import crypto from "crypto";

export interface Migration {
  version: string;
  description: string;
  up(db: any): Promise<void>;
}

// 1. Định nghĩa Migration 1.0.0
const migration100: Migration = {
  version: "1.0.0",
  description: "Khởi tạo hệ thống phòng ban và ánh xạ quyền hạn người dùng ban đầu",
  async up(db: any): Promise<void> {
    const defaultDepartments = [
      { id: "dept-cntt", name: "Phòng Công nghệ thông tin", description: "Vận hành hệ thống và an ninh mạng" },
      { id: "dept-khhc", name: "Phòng Kế hoạch Hành chính", description: "Quản lý kế hoạch và công văn hành chính" },
      { id: "dept-attt", name: "Phòng An toàn Thông tin", description: "Giám sát an ninh thông tin" }
    ];

    const defaultRoleConfigs = [
      {
        roleId: "admin",
        permissions: [
          "modules.read", "modules.manage",
          "tasks.read", "tasks.create", "tasks.update", "tasks.assign", "tasks.transition", "tasks.archive", "tasks.manage",
          "agent.use", "agent.tools.read", "audit.read"
        ]
      },
      {
        roleId: "manager",
        permissions: [
          "modules.read", "tasks.read", "tasks.create", "tasks.update", "tasks.assign", "tasks.transition", "tasks.archive",
          "agent.use", "agent.tools.read"
        ]
      },
      {
        roleId: "editor",
        permissions: ["modules.read", "tasks.read", "tasks.create", "tasks.update", "tasks.assign", "tasks.transition", "agent.use"]
      },
      {
        roleId: "operator",
        permissions: ["modules.read", "tasks.read", "tasks.create", "tasks.update", "tasks.transition"]
      },
      {
        roleId: "viewer",
        permissions: ["modules.read"]
      }
    ];

    const defaultUsers = [
      { uid: "mock-uid-admin", email: "admin@qlcv.local", displayName: "Administrator", role: "admin", departmentIds: ["dept-cntt"] },
      { uid: "mock-uid-manager", email: "manager@qlcv.local", displayName: "Manager User", role: "manager", departmentIds: ["dept-khhc"] },
      { uid: "mock-uid-editor", email: "editor@qlcv.local", displayName: "Editor User", role: "editor", departmentIds: ["dept-cntt", "dept-khhc"] }
    ];

    // Gieo hạt phòng ban
    for (const d of defaultDepartments) {
      await db.collection("departments").doc(d.id).set({
        name: d.name,
        description: d.description,
        createdAt: new Date(),
      });
    }

    // Gieo hạt phân quyền vai trò
    for (const r of defaultRoleConfigs) {
      await db.collection("system_roles").doc(r.roleId).set({
        roleId: r.roleId,
        permissions: r.permissions,
        updatedAt: new Date(),
      });
    }

    // Gieo hạt tài khoản mẫu ban đầu
    for (const u of defaultUsers) {
      await db.collection("users").doc(u.uid).set({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        departmentIds: u.departmentIds,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    logger.info("[Migration-1.0.0] Đã gieo thành công dữ liệu bảo mật, vai trò, phòng ban khởi tạo.");
  }
};

// Danh mục tất cả migrations trong hệ thống
const migrationsList: Migration[] = [migration100];

// Thời gian tối đa giữ khóa di chuyển (2 phút) để tránh deadlock
const LOCK_LEASE_MS = 120 * 1000;

class MigrationService {
  private isFirestoreReady(): boolean {
    const status = getFirebaseStatus();
    return status.status === "ready" || status.status === "initialized";
  }

  /**
   * Chạy toàn bộ migrations tuần tự
   */
  async runMigrations(requestId: string = "system-bootstrap"): Promise<void> {
    if (!this.isFirestoreReady()) {
      logger.warn("[MigrationService] Firestore chưa sẵn sàng hoặc hoạt động ở chế độ giả lập. Bỏ qua chạy di chuyển dữ liệu thực tế.");
      return;
    }

    const db = getConfiguredFirestore();
    const lockRef = db.collection("system_migration_lock").doc("lock");
    const lockInstanceId = crypto.randomUUID();
    let hasLock = false;

    logger.info(`[MigrationService] Bắt đầu kiểm tra và chạy di chuyển dữ liệu. Request ID: ${requestId}`);

    try {
      // 1. Lấy khóa phân tán sử dụng Giao dịch Firestore (OCC)
      await db.runTransaction(async (transaction) => {
        const lockDoc = await transaction.get(lockRef);
        const now = new Date();

        if (lockDoc.exists) {
          const data = lockDoc.data()!;
          const lockedAt = data.lockedAt?.toDate ? data.lockedAt.toDate() : new Date(data.lockedAt);
          const isExpired = now.getTime() - lockedAt.getTime() > LOCK_LEASE_MS;

          if (data.locked && !isExpired) {
            throw new AppError(
              "DATA_CONFLICT",
              `Lỗi di chuyển: Khóa đang được nắm giữ bởi máy chủ ${data.lockedBy} khởi tạo từ ${lockedAt.toISOString()}`
            );
          }
        }

        // Đánh dấu lấy khóa thành công
        transaction.set(lockRef, {
          locked: true,
          lockedAt: now,
          lockedBy: lockInstanceId,
          leaseTimeMs: LOCK_LEASE_MS,
        });
      });

      hasLock = true;
      logger.info(`[MigrationService] Khóa di chuyển được kích hoạt bởi máy chủ: ${lockInstanceId}`);

      // 2. Thực thi tuần tự các bản di chuyển dữ liệu chưa chạy
      for (const migration of migrationsList) {
        const historyRef = db.collection("system_migrations").doc(migration.version);
        const historyDoc = await historyRef.get();

        if (!historyDoc.exists) {
          logger.info(`[MigrationService] Tiến hành áp dụng bản di chuyển ${migration.version}: ${migration.description}`);
          
          try {
            // Chạy up
            await migration.up(db);

            // Ghi nhận lịch sử thành công
            await historyRef.set({
              version: migration.version,
              description: migration.description,
              appliedAt: new Date(),
              requestId,
              status: "success",
            });

            logger.info(`[MigrationService] Đã di chuyển thành công bản ${migration.version}`);
          } catch (migrationErr: any) {
            logger.error(`[MigrationService] Bản di chuyển ${migration.version} thất bại: ${migrationErr.message}`);
            // Ghi nhận lịch sử thất bại để debug
            await historyRef.set({
              version: migration.version,
              description: migration.description,
              appliedAt: new Date(),
              requestId,
              status: "failed",
              error: migrationErr.message,
            });
            throw migrationErr;
          }
        } else {
          logger.info(`[MigrationService] Bản di chuyển ${migration.version} đã chạy từ trước. Bỏ qua.`);
        }
      }

    } catch (err: any) {
      if (err.code === "DATA_CONFLICT" || err.message?.includes("Lỗi di chuyển: Khóa đang được nắm giữ")) {
        logger.warn(`[MigrationService] Một máy chủ khác đang thực thi migrations. Skip. Chi tiết: ${err.message}`);
      } else {
        logger.error(`[MigrationService] Gặp lỗi nghiêm trọng khi chạy di chuyển dữ liệu: ${err.message}`);
      }
    } finally {
      // 3. Giải phóng khóa nếu mình là người giữ
      if (hasLock) {
        try {
          await db.runTransaction(async (transaction) => {
            const lockDoc = await transaction.get(lockRef);
            if (lockDoc.exists) {
              const data = lockDoc.data()!;
              if (data.lockedBy === lockInstanceId) {
                transaction.update(lockRef, {
                  locked: false,
                  lockedAt: new Date(),
                  lockedBy: "none",
                });
                logger.info(`[MigrationService] Đã giải phóng khóa di chuyển thành công cho máy chủ: ${lockInstanceId}`);
              }
            }
          });
        } catch (releaseErr: any) {
          logger.error(`[MigrationService] Không thể tự động giải phóng khóa: ${releaseErr.message}`);
        }
      }
    }
  }
}

export const migrationService = new MigrationService();
export default migrationService;
